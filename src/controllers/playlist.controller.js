import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import Playlist from "../models/playlist.model.js";
import mongoose from "mongoose";

// Create a playlist
const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    if (!name?.trim()) throw new ApiError(400, "Playlist name is required");

    const playlist = await Playlist.create({
        name,
        description: description || "",
        owner: req.user._id,
    });

    return res.status(201).json(new ApiResponse(201, playlist, "Playlist created"));
});

// Get playlist by ID with videos populated
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (!mongoose.isValidObjectId(playlistId)) throw new ApiError(400, "Invalid playlist ID");

    const playlist = await Playlist.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(playlistId), isActive: true } },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
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
    ]);

    if (!playlist?.length) throw new ApiError(404, "Playlist not found");

    return res.status(200).json(new ApiResponse(200, playlist[0], "Playlist fetched"));
});

// Update playlist name/description
const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!mongoose.isValidObjectId(playlistId)) throw new ApiError(400, "Invalid playlist ID");

    const playlist = await Playlist.findOne({ _id: playlistId, owner: req.user._id, isActive: true });
    if (!playlist) throw new ApiError(404, "Playlist not found or unauthorized");

    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    await playlist.save();

    return res.status(200).json(new ApiResponse(200, playlist, "Playlist updated"));
});

// Delete playlist (soft delete)
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (!mongoose.isValidObjectId(playlistId)) throw new ApiError(400, "Invalid playlist ID");

    const playlist = await Playlist.findOne({ _id: playlistId, owner: req.user._id });
    if (!playlist) throw new ApiError(404, "Playlist not found or unauthorized");

    playlist.isActive = false;
    await playlist.save();

    return res.status(200).json(new ApiResponse(200, {}, "Playlist deleted"));
});

// Add video to playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    if (!mongoose.isValidObjectId(playlistId) || !mongoose.isValidObjectId(videoId))
        throw new ApiError(400, "Invalid ID");

    const playlist = await Playlist.findOne({ _id: playlistId, owner: req.user._id, isActive: true });
    if (!playlist) throw new ApiError(404, "Playlist not found or unauthorized");

    if (playlist.videos.some(v => v.toString() === videoId)) throw new ApiError(400, "Video already in playlist");

    playlist.videos.push(videoId);
    await playlist.save();

    return res.status(200).json(new ApiResponse(200, playlist, "Video added to playlist"));
});

// Remove video from playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    if (!mongoose.isValidObjectId(playlistId) || !mongoose.isValidObjectId(videoId))
        throw new ApiError(400, "Invalid ID");

    const playlist = await Playlist.findOne({ _id: playlistId, owner: req.user._id, isActive: true });
    if (!playlist) throw new ApiError(404, "Playlist not found or unauthorized");

    playlist.videos = playlist.videos.filter((v) => v.toString() !== videoId);
    await playlist.save();

    return res.status(200).json(new ApiResponse(200, playlist, "Video removed from playlist"));
});

// Get all playlists of a user
const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, "Invalid user ID");

    const playlists = await Playlist.find({ owner: userId, isActive: true })
        .sort({ createdAt: -1 })
        .select("name description videos createdAt");

    return res.status(200).json(new ApiResponse(200, playlists, "User playlists fetched"));
});

export { createPlaylist, getPlaylistById, updatePlaylist, deletePlaylist, addVideoToPlaylist, removeVideoFromPlaylist, getUserPlaylists };
