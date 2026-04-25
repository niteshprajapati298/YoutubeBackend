import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../services/cloudinary.service.js";
import { validateLogin, validateRegister } from "../validator.js/user.validator.js";
import { getAccessRefreshToken } from "../services/token.service.js";
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import mongoose from "mongoose";
const options = {
    httpOnly: true,
    secure: true
}

const registerUser = asyncHandler(async (req, res) => {
    // Break the logic in multiple small parts 

    // step 1 ->  get the data from the user 
    const userData = req.body
    const files = req.files
    // console.log(req.files)
    // console.log("files: ",files)
    const avatarLocalPath = files.avatar[0]?.path;

    console.log("avatarImageLocalPath", avatarLocalPath)

    userData.avatar = avatarLocalPath;

    const coverImageLocalPath = files.coverImage?.[0]?.path;
    const error = validateRegister(userData);
    console.log("coverImageLocalPath", coverImageLocalPath)

    // step 2 -> validate the data 
    if (error.length > 0) throw new ApiError(400, error);

    // step 3 -> database check if user entry already exists in database

    const isUserAlreadyExists = await User.findOne({ $or: [{ email: userData.email }, { username: userData.username }] });
    if (isUserAlreadyExists) throw new ApiError(409, "User Already Exists")

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;


    // step 4 -> create an entry in the db 
    const createdUser = await User.create({
        fullName: userData.fullName,
        username: userData.username,
        email: userData.email,
        avatar: avatar?.url,
        avatarPublicId: avatar?.public_id,
        coverImage: coverImage?.url || "",
        coverImagePublicId:coverImage?.url?.public_id,
        password: userData.password,
    })
    const { accessToken, refreshToken } = await getAccessRefreshToken(createdUser);

    let user = await User.findById(createdUser._id)
        .select("-password -refreshToken");
    return res.status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(201, {
                user,
                accessToken,
            }, "User registered successfully",)
        );
})

const loginUser = asyncHandler(async (req, res) => {
    // take the creds from the user ( req.body)
    const userData = req.body;
    console.log(userData)
    // check if the creds are provided or not
    const errors = validateLogin(userData);
    if (errors.length > 0) throw new ApiError(400, errors);

    // check if the user present in the db
    const user = await User.findOne({ email: userData.email });

    if (!user) throw new ApiError(401, "Invalid Credentials");

    const isPasswordCorrect = await user.isPasswordVerified(userData.password);

    //check if the creds are right or not
    if (!isPasswordCorrect) throw new ApiError(401, "Password Incorrect ");
    const { accessToken, refreshToken } = await getAccessRefreshToken(user);

    console.log(`Login successful: ${user.email}`);

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user,
                accessToken,
            }, "User loggedIn successfully"))
})

const logoutUser = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: null } },
        { new: true }
    );
    console.log("USER: ", user)
    res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    // console.log(incomingRefreshToken)
    if (!incomingRefreshToken) throw new ApiError(404, "Invalid Token");

    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded._id);
    if (!user) throw new ApiError(404, "Invalid Refresh Token")
    if (incomingRefreshToken !== user?.refreshToken) throw new ApiError(404, "Invalid Refresh Token");
    const { accessToken, refreshToken } = await getAccessRefreshToken(user);
    return res
        .status(200)
        .cookie("refreshToken", refreshToken)
        .cookie("accessToken", accessToken)
        .json(new ApiResponse(200, {}, "AccessToken Refreshed"));

})
const updatePassword = asyncHandler(async (req, res) => {
    const { password, newPassword } = req.body;

    if (!password || !newPassword) {
        throw new ApiError(400, "Password and NewPassword are required");
    }

    const user = req.user;

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password is incorrect");
    }

    const isMatchWithNewPassword = await bcrypt.compare(newPassword, user.password);

    if (isMatchWithNewPassword) {
        throw new ApiError(400, "New password must be different from old password");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(user._id, {
        $set: { password: hashedPassword }
    });

    return res.status(200).json(new ApiResponse(200, {}, "Password Updated Successfully"));
});

// write the update logic of the user details
const updateUserDetails = asyncHandler(async (req, res) => {
    const user = req.user;
    const { fullName, email } = req.body;

    if (!email && !fullName)
        throw new ApiError(409, "Please Provide either Email or fullName");

    if (fullName && !fullName.trim())
        throw new ApiError(409, "Please Provide fullName");

    if (email && !email.trim())
        throw new ApiError(409, "Please Provide Email");

    if (email && (email === user.email || await User.findOne({ email })))
        throw new ApiError(409, "Email is already Taken");

    if (fullName && fullName === user.fullName)
        throw new ApiError(409, "Please Provide Different fullName");

    // update values
    if (fullName) user.fullName = fullName;
    if (email) user.email = email;

    const updatedUser = await user.save();

    return res.status(200).json(
        new ApiResponse(200, updatedUser, "User Updated Successfully")
    );
});

// write the update logic of the user cover and avatar image

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const user = req.user;
    const coverImageLocalPath = req.files.coverImage[0]?.path;
    console.log(req.files)
    if (!coverImageLocalPath) throw new ApiError("Please Provide Cover Image");
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage) throw new ApiError(409, "Cannot find CoverImage")
    if (coverImage?.url) {
        user.coverImage = coverImage.url;
        user.coverImagePublicId = coverImage.public_id;
    }
        
    const updatedUser = await user.save();
    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "CoverImage Updated Successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("-password -refreshToken");
    return res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
});

const getChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username?.trim()) throw new ApiError(400, "Username is required");

    const channel = await User.aggregate([
        { $match: { username: username.toLowerCase() } },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                subscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                email: 1,
                createdAt: 1,
            },
        },
    ]);

    if (!channel?.length) throw new ApiError(404, "Channel not found");

    return res.status(200).json(new ApiResponse(200, channel[0], "Channel profile fetched"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.user._id) } },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
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
    ]);

    return res.status(200).json(new ApiResponse(200, user[0]?.watchHistory || [], "Watch history fetched"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const user = req.user;
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    if (!avatarLocalPath) throw new ApiError(400, "Please provide an avatar image");

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar?.url) throw new ApiError(500, "Error uploading avatar");

    if (user.avatarPublicId) {
        await deleteFromCloudinary(user.avatarPublicId, "image");
    }

    user.avatar = avatar.url;
    user.avatarPublicId = avatar.public_id;
    const updatedUser = await user.save();

    return res.status(200).json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

export {
    registerUser, loginUser, logoutUser, refreshAccessToken,
    updatePassword, updateUserDetails, updateUserCoverImage,
    getCurrentUser, getChannelProfile, getWatchHistory, updateUserAvatar,
};