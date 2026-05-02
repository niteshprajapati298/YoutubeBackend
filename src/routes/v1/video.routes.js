import { Router } from "express";
import {
    uploadVideo, getAllVideos, getVideoById, updateVideo,
    deleteVideo, togglePublishStatus, getUserVideos,
} from "../../controllers/video.controller.js";
import { authenticateUser, optionalAuth } from "../../middlewares/auth.middleware.js";
import { upload } from "../../middlewares/multer.middleware.js";

const router = Router();

// Public routes
router.get("/", getAllVideos);
router.get("/user/:userId", getUserVideos);
router.get("/:videoId", optionalAuth, getVideoById); // optional auth — tracks watch history if logged in

// Protected routes
router.post(
    "/upload",
    authenticateUser,
    upload.fields([
        { name: "videoFile", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 },
    ]),
    uploadVideo
);
router.put(
    "/:videoId",
    authenticateUser,
    upload.fields([{ name: "thumbnail", maxCount: 1 }]),
    updateVideo
);
router.delete("/:videoId", authenticateUser, deleteVideo);
router.patch("/toggle/publish/:videoId", authenticateUser, togglePublishStatus);

export default router;
