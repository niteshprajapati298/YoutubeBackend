import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import Video from "../models/video.model.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../services/cloudinary.service.js";
import mongoose from "mongoose";

// Upload a new video
const uploadVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title?.trim()) throw new ApiError(400, "Title is required");

    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoLocalPath) throw new ApiError(400, "Video file is required");
    if (!thumbnailLocalPath) throw new ApiError(400, "Thumbnail is required");

    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile?.url) throw new ApiError(500, "Error uploading video");
    if (!thumbnail?.url) throw new ApiError(500, "Error uploading thumbnail");

    const video = await Video.create({
        title,
        description: description || "",
        videoFile: videoFile.url,
        videoFilePublicId: videoFile.public_id,
        thumbnail: thumbnail.url,
        thumbnailPublicId: thumbnail.public_id,
        duration: videoFile.duration || 0,
        owner: req.user._id,
        isPublished: true,
    });

    return res.status(201).json(new ApiResponse(201, video, "Video uploaded successfully"));
});

// Get all published videos with pagination and search
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;

    const pipeline = [];

    // Match only published and active videos
    const matchStage = { isPublished: true, isActive: true };
    if (userId) matchStage.owner = new mongoose.Types.ObjectId(userId);

    pipeline.push({ $match: matchStage });

    // Search by title or description
    if (query) {
        pipeline.push({
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } },
                ],
            },
        });
    }

    // Lookup owner details
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
        },
    });
    pipeline.push({ $addFields: { owner: { $first: "$owner" } } });

    // Sort
    pipeline.push({ $sort: { [sortBy]: sortType === "asc" ? 1 : -1 } });

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    const videos = await Video.aggregate(pipeline);

    // Count total
    const countPipeline = [{ $match: matchStage }];
    if (query) {
        countPipeline.push({
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } },
                ],
            },
        });
    }
    countPipeline.push({ $count: "total" });
    const countResult = await Video.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    return res.status(200).json(
        new ApiResponse(200, { videos, total, page: parseInt(page), limit: parseInt(limit) }, "Videos fetched")
    );
});

// Get video by ID and increment views
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const updated = await Video.findOneAndUpdate(
        { _id: videoId, isPublished: true, isActive: true },
        { $inc: { views: 1 } },
        { new: true }
    );

    if (!updated) throw new ApiError(404, "Video not found");

    const currentUserId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null;

    const video = await Video.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        },
                    },
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            subscribersCount: { $size: "$subscribers" },
                            isSubscribed: currentUserId
                                ? { $in: [currentUserId, "$subscribers.subscriber"] }
                                : false,
                        },
                    },
                ],
            },
        },
        { $addFields: { owner: { $first: "$owner" }, views: updated.views } },
    ]);

    // Add to watch history if user is logged in
    if (req.user) {
        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { watchHistory: videoId },
        });
    }

    return res.status(200).json(new ApiResponse(200, video[0], "Video fetched"));
});

// Update video details
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const video = await Video.findOne({ _id: videoId, owner: req.user._id, isActive: true });
    if (!video) throw new ApiError(404, "Video not found or unauthorized");

    const { title, description } = req.body;
    if (title) video.title = title;
    if (description !== undefined) video.description = description;

    // Update thumbnail if provided
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
    if (thumbnailLocalPath) {
        if (video.thumbnailPublicId) {
            await deleteFromCloudinary(video.thumbnailPublicId, "image");
        }
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (thumbnail?.url) {
            video.thumbnail = thumbnail.url;
            video.thumbnailPublicId = thumbnail.public_id;
        }
    }

    const updatedVideo = await video.save();
    return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

// Delete video (soft delete)
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const video = await Video.findOne({ _id: videoId, owner: req.user._id });
    if (!video) throw new ApiError(404, "Video not found or unauthorized");

    // Delete from Cloudinary
    if (video.videoFilePublicId) await deleteFromCloudinary(video.videoFilePublicId, "video");
    if (video.thumbnailPublicId) await deleteFromCloudinary(video.thumbnailPublicId, "image");

    video.isActive = false;
    await video.save();

    return res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));
});

// Toggle publish status
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const video = await Video.findOne({ _id: videoId, owner: req.user._id, isActive: true });
    if (!video) throw new ApiError(404, "Video not found or unauthorized");

    video.isPublished = !video.isPublished;
    await video.save();

    return res.status(200).json(
        new ApiResponse(200, { isPublished: video.isPublished }, `Video ${video.isPublished ? "published" : "unpublished"}`)
    );
});

// Get videos by a specific user (their channel)
const getUserVideos = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, "Invalid user ID");

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const videos = await Video.find({ owner: userId, isPublished: true, isActive: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("owner", "fullName username avatar");

    const total = await Video.countDocuments({ owner: userId, isPublished: true, isActive: true });

    return res.status(200).json(
        new ApiResponse(200, { videos, total, page: parseInt(page), limit: parseInt(limit) }, "User videos fetched")
    );
});

export { uploadVideo, getAllVideos, getVideoById, updateVideo, deleteVideo, togglePublishStatus, getUserVideos };
