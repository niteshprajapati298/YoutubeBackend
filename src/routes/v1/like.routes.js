import { Router } from "express";
import {
    toggleVideoLike, toggleCommentLike, getLikedVideos, getVideoLikes,
} from "../../controllers/like.controller.js";
import { authenticateUser } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/video/:videoId", authenticateUser, getVideoLikes);
router.post("/toggle/video/:videoId", authenticateUser, toggleVideoLike);
router.post("/toggle/v/:videoId", authenticateUser, toggleVideoLike);
router.post("/toggle/comment/:commentId", authenticateUser, toggleCommentLike);
router.get("/videos", authenticateUser, getLikedVideos);

export default router;
