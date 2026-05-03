import multer from "multer";
import { FILE_LIMITS } from "./multer.middleware.js";

const MB = 1024 * 1024;
const formatMB = (bytes) => `${Math.round(bytes / MB)} MB`;

export const uploadErrorHandler = (err, _req, _res, next) => {
    if (err instanceof multer.MulterError) {
        let statusCode = 400;
        let message;
        switch (err.code) {
            case "LIMIT_FILE_SIZE":
                statusCode = 413;
                message = `File too large. Max size: ${formatMB(FILE_LIMITS.video)} for videos, ${formatMB(FILE_LIMITS.image)} for images.`;
                break;
            case "LIMIT_FILE_COUNT":
            case "LIMIT_PART_COUNT":
                message = "Too many files in the upload.";
                break;
            case "LIMIT_UNEXPECTED_FILE":
                message = `Unexpected file field: "${err.field}".`;
                break;
            case "LIMIT_FIELD_VALUE":
            case "LIMIT_FIELD_KEY":
                message = "A form field is too large.";
                break;
            default:
                message = err.message || "File upload failed.";
        }
        return next(Object.assign(new Error(message), { statusCode }));
    }

    if (err && /Invalid (video|image) format|Unexpected file field/.test(err.message)) {
        return next(Object.assign(err, { statusCode: 415 }));
    }

    next(err);
};
