import { ApiError } from "../../utils/ApiError.js";
import jwt from 'jsonwebtoken'
import User from "../models/user.model.js";
import asyncHandler from "../../utils/asyncHandler.js";
const authenticateUser = asyncHandler(async (req, res, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");


    if (!token) throw new ApiError(401, "Unauthorized Request");

    const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken._id);
    if (!user) throw new ApiError(401, "Invalid Access Token");
    req.user = user;
    next();

});

// Does not throw if no token — useful for public routes that benefit from knowing who the user is
const optionalAuth = asyncHandler(async (req, res, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

    if (!token) return next();

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken._id);
        if (user) req.user = user;
    } catch (_) {}

    next();
});

export { authenticateUser, optionalAuth };