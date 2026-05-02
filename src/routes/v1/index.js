import { Router } from "express";

const router = Router();

import userRoutes from "./user.routes.js";
import videoRoutes from "./video.routes.js";
import subscriptionRoutes from "./subscription.routes.js";
import commentRoutes from "./comment.routes.js";
import likeRoutes from "./like.routes.js";
import playlistRoutes from "./playlist.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import communityPostRoutes from "./communityPost.routes.js";

router.use('/user', userRoutes);
router.use('/videos', videoRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/comments', commentRoutes);
router.use('/likes', likeRoutes);
router.use('/playlist', playlistRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/community', communityPostRoutes);

export default router;