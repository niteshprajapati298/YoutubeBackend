import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import Video from "../models/video.model.js";
import Subscription from "../models/subscription.model.js";
import Like from "../models/like.model.js";
import mongoose from "mongoose";

// Get channel stats for the logged-in user
const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const [totalVideos, totalSubscribers, videoStats] = await Promise.all([
        Video.countDocuments({ owner: userId, isActive: true }),
        Subscription.countDocuments({ channel: userId }),
        Video.aggregate([
            { $match: { owner: new mongoose.Types.ObjectId(userId), isActive: true } },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "video",
                    as: "likes",
                },
            },
            {
                $group: {
                    _id: null,
                    totalViews: { $sum: "$views" },
                    totalLikes: { $sum: { $size: "$likes" } },
                },
            },
        ]),
    ]);

    const stats = {
        totalVideos,
        totalSubscribers,
        totalViews: videoStats[0]?.totalViews || 0,
        totalLikes: videoStats[0]?.totalLikes || 0,
    };

    return res.status(200).json(new ApiResponse(200, stats, "Channel stats fetched"));
});

// Get all videos of the logged-in user (for their dashboard)
const getChannelVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const videos = await Video.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(req.user._id), isActive: true } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
            },
        },
        { $project: { likes: 0 } },
    ]);

    const total = await Video.countDocuments({ owner: req.user._id, isActive: true });

    return res.status(200).json(
        new ApiResponse(200, { videos, total, page: parseInt(page), limit: parseInt(limit) }, "Channel videos fetched")
    );
});

export { getChannelStats, getChannelVideos };
