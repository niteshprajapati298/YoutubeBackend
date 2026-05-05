import cloudinary from "../config/cloudinary.js";
import fs from "fs/promises";
import { ApiError } from "../../utils/ApiError.js";

const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

const safeUnlink = async (filePath) => {
    try {
        await fs.unlink(filePath);
    } catch (_) { /* ignore */ }
};

const uploadOnCloudinary = async (localFilePath) => {
    if (!localFilePath) {
        throw new ApiError(400, "File path not provided");
    }

    try {
        const baseOptions = {
            resource_type: "auto",
            folder: "youtube",
            timeout: UPLOAD_TIMEOUT_MS,
        };

        // Use standard upload() for both videos and images
        // Cloudinary handles large files automatically
        const response = await cloudinary.uploader.upload(localFilePath, baseOptions);

        await safeUnlink(localFilePath);

        // Validate response has URL
        const url = response?.url || response?.secure_url;
        if (!url) {
            console.error("[Cloudinary] Invalid response:", {
                hasUrl: !!response?.url,
                hasSecureUrl: !!response?.secure_url,
                keys: Object.keys(response || {}),
            });
            throw new ApiError(502, "Cloudinary upload returned no URL");
        }

        return response;
    } catch (error) {
        await safeUnlink(localFilePath);

        console.error("[Cloudinary] upload failed:", {
            file: localFilePath,
            http_code: error?.http_code,
            name: error?.name,
            message: error?.message,
        });

        if (error instanceof ApiError) throw error;

        const message = error?.message || "";
        if (/timeout/i.test(message) || error?.http_code === 499) {
            throw new ApiError(504, "Upload to storage timed out. Please try again with a smaller file or better connection.");
        }
        if (error?.http_code === 413 || /too large|file size/i.test(message)) {
            throw new ApiError(413, "File is too large for the storage provider.");
        }
        if (error?.http_code === 401) {
            throw new ApiError(500, "Storage provider authentication failed. Check CLOUDINARY_* env vars.");
        }

        throw new ApiError(502, message || "Failed to upload file to storage.");
    }
};

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    if (!publicId) return null;
    try {
        return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
        console.error("Cloudinary delete error:", error?.message || error);
        return null;
    }
};

export { uploadOnCloudinary, deleteFromCloudinary };
