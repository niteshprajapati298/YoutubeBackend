import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import CommunityPost from "../models/communityPost.model.js";
import Like from "../models/like.model.js";
import Subscription from "../models/subscription.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../services/cloudinary.service.js";
import mongoose from "mongoose";

// Create a community post (text / image / poll)
const createPost = asyncHandler(async (req, res) => {
    const { content, type, pollQuestion, pollOptions } = req.body;

    if (!type || !["text", "image", "poll"].includes(type))
        throw new ApiError(400, "type must be 'text', 'image', or 'poll'");

    if (type === "text" && !content?.trim())
        throw new ApiError(400, "Content is required for a text post");

    if (type === "poll") {
        if (!pollQuestion?.trim()) throw new ApiError(400, "Poll question is required");
        let options;
        try {
            options = typeof pollOptions === "string" ? JSON.parse(pollOptions) : pollOptions;
        } catch {
            throw new ApiError(400, "pollOptions must be a JSON array of strings");
        }
        if (!Array.isArray(options) || options.length < 2)
            throw new ApiError(400, "Poll must have at least 2 options");
    }

    const postData = {
        owner: req.user._id,
        type,
        content: content || "",
    };

    if (type === "image") {
        const imageLocalPath = req.files?.image?.[0]?.path;
        if (!imageLocalPath) throw new ApiError(400, "Image file is required for an image post");
        const uploaded = await uploadOnCloudinary(imageLocalPath);
        if (!uploaded?.url) throw new ApiError(500, "Error uploading image");
        postData.image = uploaded.url;
        postData.imagePublicId = uploaded.public_id;
    }

    if (type === "poll") {
        const options = typeof pollOptions === "string" ? JSON.parse(pollOptions) : pollOptions;
        postData.poll = {
            question: pollQuestion.trim(),
            options: options.map((text) => ({ text: String(text).trim(), votes: [] })),
        };
    }

    const post = await CommunityPost.create(postData);
    const populated = await post.populate("owner", "fullName username avatar");

    return res.status(201).json(new ApiResponse(201, populated, "Post created"));
});

// Get feed — posts from channels the user is subscribed to + own posts
const getFeed = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get channels the current user subscribes to
    const subscriptions = await Subscription.find({ subscriber: req.user._id }).select("channel");
    const channelIds = subscriptions.map((s) => s.channel);
    channelIds.push(req.user._id); // include own posts

    const posts = await CommunityPost.aggregate([
        { $match: { owner: { $in: channelIds }, isActive: true } },
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
                foreignField: "communityPost",
                as: "likes",
            },
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                isLiked: {
                    $in: [new mongoose.Types.ObjectId(req.user._id), "$likes.likedBy"],
                },
            },
        },
        { $project: { likes: 0 } },
    ]);

    const total = await CommunityPost.countDocuments({ owner: { $in: channelIds }, isActive: true });

    return res.status(200).json(
        new ApiResponse(200, { posts, total, page: parseInt(page), limit: parseInt(limit) }, "Feed fetched")
    );
});

// Get all posts by a specific channel (public)
const getChannelPosts = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.isValidObjectId(channelId)) throw new ApiError(400, "Invalid channel ID");

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await CommunityPost.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(channelId), isActive: true } },
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
                foreignField: "communityPost",
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

    const total = await CommunityPost.countDocuments({ owner: channelId, isActive: true });

    return res.status(200).json(
        new ApiResponse(200, { posts, total, page: parseInt(page), limit: parseInt(limit) }, "Channel posts fetched")
    );
});

// Get single post by ID
const getPostById = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    if (!mongoose.isValidObjectId(postId)) throw new ApiError(400, "Invalid post ID");

    const post = await CommunityPost.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(postId), isActive: true } },
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
                foreignField: "communityPost",
                as: "likes",
            },
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                isLiked: req.user
                    ? { $in: [new mongoose.Types.ObjectId(req.user._id), "$likes.likedBy"] }
                    : false,
            },
        },
        { $project: { likes: 0 } },
    ]);

    if (!post?.length) throw new ApiError(404, "Post not found");

    return res.status(200).json(new ApiResponse(200, post[0], "Post fetched"));
});

// Update post (only content/image — polls cannot be edited after creation)
const updatePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    if (!mongoose.isValidObjectId(postId)) throw new ApiError(400, "Invalid post ID");

    const post = await CommunityPost.findOne({ _id: postId, owner: req.user._id, isActive: true });
    if (!post) throw new ApiError(404, "Post not found or unauthorized");

    if (post.type === "poll") throw new ApiError(400, "Poll posts cannot be edited");

    const { content } = req.body;
    if (content !== undefined) post.content = content;

    if (post.type === "image") {
        const imageLocalPath = req.files?.image?.[0]?.path;
        if (imageLocalPath) {
            if (post.imagePublicId) await deleteFromCloudinary(post.imagePublicId, "image");
            const uploaded = await uploadOnCloudinary(imageLocalPath);
            if (uploaded?.url) {
                post.image = uploaded.url;
                post.imagePublicId = uploaded.public_id;
            }
        }
    }

    await post.save();
    return res.status(200).json(new ApiResponse(200, post, "Post updated"));
});

// Delete post (soft delete)
const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    if (!mongoose.isValidObjectId(postId)) throw new ApiError(400, "Invalid post ID");

    const post = await CommunityPost.findOne({ _id: postId, owner: req.user._id });
    if (!post) throw new ApiError(404, "Post not found or unauthorized");

    if (post.imagePublicId) await deleteFromCloudinary(post.imagePublicId, "image");

    post.isActive = false;
    await post.save();

    return res.status(200).json(new ApiResponse(200, {}, "Post deleted"));
});

// Toggle like on a community post
const togglePostLike = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    if (!mongoose.isValidObjectId(postId)) throw new ApiError(400, "Invalid post ID");

    const post = await CommunityPost.findOne({ _id: postId, isActive: true });
    if (!post) throw new ApiError(404, "Post not found");

    const existing = await Like.findOne({ communityPost: postId, likedBy: req.user._id });

    if (existing) {
        await Like.deleteOne({ _id: existing._id });
        const count = await Like.countDocuments({ communityPost: postId });
        return res.status(200).json(new ApiResponse(200, { liked: false, likesCount: count }, "Like removed"));
    }

    await Like.create({ communityPost: postId, likedBy: req.user._id });
    const count = await Like.countDocuments({ communityPost: postId });

    return res.status(200).json(new ApiResponse(200, { liked: true, likesCount: count }, "Post liked"));
});

// Vote on a poll option
const votePoll = asyncHandler(async (req, res) => {
    const { postId, optionId } = req.params;
    if (!mongoose.isValidObjectId(postId)) throw new ApiError(400, "Invalid post ID");

    const post = await CommunityPost.findOne({ _id: postId, isActive: true, type: "poll" });
    if (!post) throw new ApiError(404, "Poll not found");

    const option = post.poll.options.id(optionId);
    if (!option) throw new ApiError(404, "Poll option not found");

    const userId = req.user._id.toString();

    // Check if user already voted on any option
    const alreadyVotedOption = post.poll.options.find((opt) =>
        opt.votes.map((v) => v.toString()).includes(userId)
    );

    if (alreadyVotedOption) {
        if (alreadyVotedOption._id.toString() === optionId) {
            // Remove vote (toggle off)
            alreadyVotedOption.votes = alreadyVotedOption.votes.filter((v) => v.toString() !== userId);
        } else {
            // Switch vote
            alreadyVotedOption.votes = alreadyVotedOption.votes.filter((v) => v.toString() !== userId);
            option.votes.push(req.user._id);
        }
    } else {
        option.votes.push(req.user._id);
    }

    await post.save();

    // Return poll results (vote counts only, not who voted)
    const results = post.poll.options.map((opt) => ({
        _id: opt._id,
        text: opt.text,
        voteCount: opt.votes.length,
        votedByMe: opt.votes.map((v) => v.toString()).includes(userId),
    }));

    return res.status(200).json(new ApiResponse(200, { question: post.poll.question, options: results }, "Vote recorded"));
});

export { createPost, getFeed, getChannelPosts, getPostById, updatePost, deletePost, togglePostLike, votePoll };
