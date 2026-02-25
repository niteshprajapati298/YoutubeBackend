
import bcrypt from "bcrypt";
import mongoose, { Schema } from "mongoose";
import jwt from 'jsonwebtoken'
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
        lowercase: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullName: {
        type: String,
        required: true,
    },
    avatar: {
        type: String, // cloudinary url 
        trim: true
    },
    coverImage: {
        type: String,
    },
    password: {
        type: String
    },
    refreshToken: {
        type: String
    },
    watchHistory: [{
        type: Schema.Types.ObjectId,
        ref: 'Video'
    }],
    refreshToken: {
        type: String
    }

}, {
    timestamps: true
})

userSchema.pre("save", async function (next) {
    if (!this.isModified(this.password)) return next();
    this.password = bcrypt.hash(this.password, 10);
    return next();
})
userSchema.methods.isPasswordVerified = async function (password) {
    return bcrypt.compare(password, this.password)
}
userSchema.methods.generateAccessToken = async function () {
    return jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
    },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_SECRET
        }
    )
}
userSchema.methods.generateRefreshToken = async function () {
    return jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
    },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_SECRET
        }
    )
}
const User = mongoose.model('User', userSchema);
export default User;
