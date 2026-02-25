import { uploadOnCloudinary } from "../config/cloudinary";
import fs from "fs/promises";

export const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) {
    throw new Error("File path not provided");
  }

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "your_app",
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