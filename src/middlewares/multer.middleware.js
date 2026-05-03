import fs from "fs";
import multer from "multer";
import os from "os";
import path from "path";

const MB = 1024 * 1024;

export const FILE_LIMITS = {
    video: 100 * MB,
    image: 10 * MB,
};

const ALLOWED_MIMETYPES = {
    video: ["video/mp4", "video/quicktime", "video/x-matroska", "video/webm", "video/avi", "video/x-msvideo"],
    image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
};

const TEMP_UPLOAD_DIR = path.join(os.tmpdir(), "youtube_clone_uploads");
if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
    fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}

const VIDEO_FIELDS = new Set(["videoFile"]);
const IMAGE_FIELDS = new Set(["thumbnail", "avatar", "coverImage", "image"]);

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, TEMP_UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const safe = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
        cb(null, `${Date.now()}-${safe}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    if (VIDEO_FIELDS.has(file.fieldname)) {
        if (!ALLOWED_MIMETYPES.video.includes(file.mimetype)) {
            return cb(new Error(`Invalid video format. Allowed: mp4, mov, mkv, webm, avi`));
        }
        return cb(null, true);
    }
    if (IMAGE_FIELDS.has(file.fieldname)) {
        if (!ALLOWED_MIMETYPES.image.includes(file.mimetype)) {
            return cb(new Error(`Invalid image format. Allowed: jpg, png, webp, gif`));
        }
        return cb(null, true);
    }
    cb(new Error(`Unexpected file field: ${file.fieldname}`));
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: FILE_LIMITS.video,
        files: 2,
    },
});
