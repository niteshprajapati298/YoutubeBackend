import { Router } from "express";
import {
    toggleSubscription,
    getChannelSubscribers,
    getSubscribedChannels,
} from "../../controllers/subscription.controller.js";
import { authenticateUser } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateUser); // all subscription routes require auth

router.post("/toggle/:channelId", toggleSubscription);
router.post("/c/:channelId", toggleSubscription);
router.get("/subscribers/:channelId", getChannelSubscribers);
router.get("/subscribed/:subscriberId", getSubscribedChannels);

export default router;
