import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import Comment from "../models/comment.model.js";
import Video from "../models/video.model.js";
import mongoose from "mongoose";

// Add a comment to a video
const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");
    if (!content?.trim()) throw new ApiError(400, "Comment content is required");

    const video = await Video.findOne({ _id: videoId, isActive: true });
    if (!video) throw new ApiError(404, "Video not found");

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id,
    });

    const populated = await comment.populate("owner", "fullName username avatar");

    return res.status(201).json(new ApiResponse(201, populated, "Comment added"));
});

// Get all comments for a video with pagination
const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const comments = await Comment.aggregate([
        { $match: { video: new mongoose.Types.ObjectId(videoId), isActive: true } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
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
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            },
        },
        { $addFields: {
            likesCount: { $size: "$likes" },
            isLiked: req.user
                ? { $in: [req.user._id, "$likes.likedBy"] }
                : false,
        }},
        { $project: { likes: 0 } },
    ]);

    const total = await Comment.countDocuments({ video: videoId, isActive: true });

    return res.status(200).json(
        new ApiResponse(200, { comments, total, page: parseInt(page), limit: parseInt(limit) }, "Comments fetched")
    );
});

// Update a comment
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!mongoose.isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment ID");
    if (!content?.trim()) throw new ApiError(400, "Content is required");

    const comment = await Comment.findOne({ _id: commentId, owner: req.user._id, isActive: true });
    if (!comment) throw new ApiError(404, "Comment not found or unauthorized");

    comment.content = content;
    await comment.save();

    return res.status(200).json(new ApiResponse(200, comment, "Comment updated"));
});

// Delete a comment (soft delete)
const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if (!mongoose.isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment ID");

    const comment = await Comment.findOne({ _id: commentId, owner: req.user._id });
    if (!comment) throw new ApiError(404, "Comment not found or unauthorized");

    comment.isActive = false;
    await comment.save();

    return res.status(200).json(new ApiResponse(200, {}, "Comment deleted"));
});

export { addComment, getVideoComments, updateComment, deleteComment };
