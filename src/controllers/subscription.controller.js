import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import Subscription from "../models/subscription.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

// Toggle subscribe / unsubscribe
const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    if (!mongoose.isValidObjectId(channelId)) throw new ApiError(400, "Invalid channel ID");

    if (channelId === req.user._id.toString()) throw new ApiError(400, "You cannot subscribe to yourself");

    const channel = await User.findById(channelId);
    if (!channel) throw new ApiError(404, "Channel not found");

    const existing = await Subscription.findOne({ subscriber: req.user._id, channel: channelId });

    if (existing) {
        await Subscription.deleteOne({ _id: existing._id });
        return res.status(200).json(new ApiResponse(200, { subscribed: false }, "Unsubscribed successfully"));
    }

    await Subscription.create({ subscriber: req.user._id, channel: channelId });
    return res.status(200).json(new ApiResponse(200, { subscribed: true }, "Subscribed successfully"));
});

// Get all subscribers of a channel
const getChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    if (!mongoose.isValidObjectId(channelId)) throw new ApiError(400, "Invalid channel ID");

    const subscribers = await Subscription.aggregate([
        { $match: { channel: new mongoose.Types.ObjectId(channelId) } },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
            },
        },
        { $addFields: { subscriber: { $first: "$subscriber" } } },
        { $project: { subscriber: 1, createdAt: 1 } },
    ]);

    return res.status(200).json(
        new ApiResponse(200, { subscribers, count: subscribers.length }, "Subscribers fetched")
    );
});

// Get all channels a user has subscribed to
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    if (!mongoose.isValidObjectId(subscriberId)) throw new ApiError(400, "Invalid subscriber ID");

    const channels = await Subscription.aggregate([
        { $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) } },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
            },
        },
        { $addFields: { channel: { $first: "$channel" } } },
        { $project: { channel: 1, createdAt: 1 } },
    ]);

    return res.status(200).json(
        new ApiResponse(200, { channels, count: channels.length }, "Subscribed channels fetched")
    );
});

export { toggleSubscription, getChannelSubscribers, getSubscribedChannels };
