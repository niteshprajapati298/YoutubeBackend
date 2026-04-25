import { Router } from "express";
import {
    addComment, getVideoComments, updateComment, deleteComment,
} from "../../controllers/comment.controller.js";
import { authenticateUser } from "../../middlewares/auth.middleware.js";

const router = Router();

// Get comments is public; add/update/delete require auth
router.get("/:videoId", getVideoComments);
router.post("/:videoId", authenticateUser, addComment);
router.put("/:commentId", authenticateUser, updateComment);
router.delete("/:commentId", authenticateUser, deleteComment);

export default router;
