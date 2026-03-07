import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../../controllers/user.controller.js";
import { upload } from "../../middlewares/multer.middleware.js"
import { authenticateUser } from "../../middlewares/auth.middleware.js";
const router = Router();
router.post('/register', upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1
    }
]), registerUser)
router.post('/login', loginUser);
router.post('/logout', authenticateUser, logoutUser)

export default router