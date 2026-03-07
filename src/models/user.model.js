
import bcrypt from "bcrypt";
import mongoose, { Schema } from "mongoose";
import jwt from 'jsonwebtoken'
const userSchema = new Schema({

    isActive: {
        type: Boolean,
        default: true
    },
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
        type: String,
        required: true
    },
    refreshToken: {
        type: String
    },
    watchHistory: [{
        type: Schema.Types.ObjectId,
        ref: 'Video'
    }]
}, {
    timestamps: true
})

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);

    next();
});
userSchema.methods.isPasswordVerified = async function (password) {
    return await bcrypt.compare(password, this.password)
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
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
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
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}
const User = mongoose.model('User', userSchema);
export default User;
