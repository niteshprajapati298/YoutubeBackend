import { Router } from "express";
import { getChannelStats, getChannelVideos } from "../../controllers/dashboard.controller.js";
import { authenticateUser } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateUser);

router.get("/stats", getChannelStats);
router.get("/videos", getChannelVideos);

export default router;
