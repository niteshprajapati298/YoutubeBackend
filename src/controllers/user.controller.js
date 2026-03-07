import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../services/cloudinary.service.js";
import { validateLogin, validateRegister } from "../validator.js/user.validator.js";
import { getAccessRefreshToken } from "../services/token.service.js";


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

    const coverImageLocalPath = files.coverImage[0]?.path;
    const error = validateRegister(userData);
    console.log("coverImageLocalPath", coverImageLocalPath)

    // step 2 -> validate the data 
    if (error.length > 0) throw new ApiError(400, error);

    // step 3 -> database check if user entry already exists in database

    const isUserAlreadyExists = await User.findOne({ $or: [{ email: userData.email }, { username: userData.username }] });
    if (isUserAlreadyExists) throw new ApiError(409, "User Already Exists")

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    // step 4 -> create an entry in the db 
    const createdUser = await User.create({
        fullName: userData.fullName,
        username: userData.username,
        email: userData.email,
        avatar: avatar?.url,
        coverImage: coverImage?.url || "",
        password: userData.password,
    })
    const { accessToken, refreshToken } = await getAccessRefreshToken(createdUser);

    let user = await User.findById(createdUser._id)
        .select("-password -refreshToken");
    return res.status(201)
        .cookie("accessToken", accessToken, options)
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

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(200, {
                user,
                accessToken,
            }, "User loggedIn successfully"))
})

const logoutUser = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: 1 } },
        { new: true }
    );
  console.log("USER: " , user)
    res
        .status(200)
        .clearCookie("accessToken", options)
        .json(new ApiResponse(200, {}, "User logged Out successfully"));
});
export { registerUser, loginUser, logoutUser };