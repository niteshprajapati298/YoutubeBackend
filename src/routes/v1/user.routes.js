import { Router } from "express";
import {
    loginUser, logoutUser, refreshAccessToken, registerUser,
    updatePassword, updateUserCoverImage, updateUserDetails,
    getCurrentUser, getChannelProfile, getWatchHistory, updateUserAvatar,
} from "../../controllers/user.controller.js";
import { upload } from "../../middlewares/multer.middleware.js";
import { authenticateUser } from "../../middlewares/auth.middleware.js";

const router = Router();

// Auth routes
router.post('/register', upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
]), registerUser);
router.post('/login', loginUser);
router.post('/logout', authenticateUser, logoutUser);
router.post('/refreshAccessToken', refreshAccessToken);

// Profile routes
router.get('/me', authenticateUser, getCurrentUser);
router.get('/channel/:username', authenticateUser, getChannelProfile);
router.get('/watchHistory', authenticateUser, getWatchHistory);

// Update routes
router.put('/updatePassword', authenticateUser, updatePassword);
router.put('/updateUser', authenticateUser, updateUserDetails);
router.put('/updateAvatar', authenticateUser, upload.fields([{ name: "avatar", maxCount: 1 }]), updateUserAvatar);
router.put('/updateUserCoverImage', authenticateUser, upload.fields([{ name: "coverImage", maxCount: 1 }]), updateUserCoverImage);

export default router;