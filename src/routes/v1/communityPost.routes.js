import { Router } from "express";
import {
    createPost, getFeed, getChannelPosts, getPostById,
    updatePost, deletePost, togglePostLike, votePoll,
} from "../../controllers/communityPost.controller.js";
import { authenticateUser, optionalAuth } from "../../middlewares/auth.middleware.js";
import { upload } from "../../middlewares/multer.middleware.js";

const router = Router();

// Public
router.get("/channel/:channelId", getChannelPosts);
router.get("/:postId", optionalAuth, getPostById);

// Protected
router.use(authenticateUser);

router.get("/", getFeed);
router.post(
    "/",
    upload.fields([{ name: "image", maxCount: 1 }]),
    createPost
);
router.put(
    "/:postId",
    upload.fields([{ name: "image", maxCount: 1 }]),
    updatePost
);
router.delete("/:postId", deletePost);
router.post("/like/:postId", togglePostLike);
router.post("/poll/vote/:postId/:optionId", votePoll);

export default router;
