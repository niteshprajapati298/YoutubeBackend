import cloudinary  from "../config/cloudinary.js";
import fs from "fs/promises";

export const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) {
    throw new Error("File path not provided");
  }

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "youtube",
    });

    await fs.unlink(localFilePath);
    console.log("File Uploaded Successfully")
    return response;

  } catch (error) {
    try {
      await fs.uninks(localFilePath);
    } catch (_) {}

    throw error;
  }
};