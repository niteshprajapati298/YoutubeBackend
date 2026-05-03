import cloudinary from "../config/cloudinary.js";
import fs from "fs/promises";
import { ApiError } from "../../utils/ApiError.js";

const VIDEO_CHUNK_SIZE = 6 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

const isVideo = (filePath) => /\.(mp4|mov|mkv|webm|avi)$/i.test(filePath);

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

        const response = isVideo(localFilePath)
            ? await cloudinary.uploader.upload_large(localFilePath, {
                  ...baseOptions,
                  resource_type: "video",
                  chunk_size: VIDEO_CHUNK_SIZE,
              })
            : await cloudinary.uploader.upload(localFilePath, baseOptions);

        await safeUnlink(localFilePath);

        if (!response?.url && !response?.secure_url) {
            console.error("[Cloudinary] response missing url:", JSON.stringify(response));
            throw new ApiError(502, response?.error?.message || "Cloudinary returned no URL for the upload.");
        }
        return response;
    } catch (error) {
        await safeUnlink(localFilePath);

        console.error("[Cloudinary] upload failed:", {
            file: localFilePath,
            http_code: error?.http_code,
            name: error?.name,
            message: error?.message,
            body: error?.error || error?.response?.body,
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
