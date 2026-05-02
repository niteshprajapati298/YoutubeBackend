import { Router } from "express";
import {
    addComment, getVideoComments, updateComment, deleteComment,
} from "../../controllers/comment.controller.js";
import { authenticateUser, optionalAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

// Get comments is public but uses optionalAuth so isLiked is populated for logged-in users
router.get("/:videoId", optionalAuth, getVideoComments);
router.post("/:videoId", authenticateUser, addComment);
router.put("/:commentId", authenticateUser, updateComment);
router.delete("/:commentId", authenticateUser, deleteComment);

export default router;
