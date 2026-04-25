import cloudinary from "../config/cloudinary.js";
import fs from "fs/promises";

const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) {
    throw new Error("File path not provided");
  }

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "youtube",
    });

    await fs.unlink(localFilePath);
    console.log("File Uploaded Successfully");
    return response;

  } catch (error) {
    try {
      await fs.unlink(localFilePath);
    } catch (_) { }

    throw error;
  }
};

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return null;
  try {
    const response = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return response;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };