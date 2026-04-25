import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import Like from "../models/like.model.js";
import mongoose from "mongoose";

// Toggle like on a video
const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const existing = await Like.findOne({ video: videoId, likedBy: req.user._id });

    if (existing) {
        await Like.deleteOne({ _id: existing._id });
        const count = await Like.countDocuments({ video: videoId });
        return res.status(200).json(new ApiResponse(200, { liked: false, likesCount: count }, "Like removed"));
    }

    await Like.create({ video: videoId, likedBy: req.user._id });
    const count = await Like.countDocuments({ video: videoId });

    return res.status(200).json(new ApiResponse(200, { liked: true, likesCount: count }, "Video liked"));
});

// Toggle like on a comment
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if (!mongoose.isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment ID");

    const existing = await Like.findOne({ comment: commentId, likedBy: req.user._id });

    if (existing) {
        await Like.deleteOne({ _id: existing._id });
        const count = await Like.countDocuments({ comment: commentId });
        return res.status(200).json(new ApiResponse(200, { liked: false, likesCount: count }, "Like removed"));
    }

    await Like.create({ comment: commentId, likedBy: req.user._id });
    const count = await Like.countDocuments({ comment: commentId });

    return res.status(200).json(new ApiResponse(200, { liked: true, likesCount: count }, "Comment liked"));
});

// Get all videos liked by current user
const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        { $match: { likedBy: new mongoose.Types.ObjectId(req.user._id), video: { $ne: null } } },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    { $match: { isPublished: true, isActive: true } },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
                        },
                    },
                    { $addFields: { owner: { $first: "$owner" } } },
                ],
            },
        },
        { $addFields: { video: { $first: "$video" } } },
        { $match: { video: { $ne: null } } },
        { $project: { video: 1, createdAt: 1 } },
        { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos fetched"));
});

// Get like count for a video (and whether current user liked it)
const getVideoLikes = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const count = await Like.countDocuments({ video: videoId });
    const isLiked = req.user
        ? !!(await Like.findOne({ video: videoId, likedBy: req.user._id }))
        : false;

    return res.status(200).json(new ApiResponse(200, { likesCount: count, isLiked }, "Likes fetched"));
});

export { toggleVideoLike, toggleCommentLike, getLikedVideos, getVideoLikes };
