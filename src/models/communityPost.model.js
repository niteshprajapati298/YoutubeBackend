import mongoose, { Schema } from "mongoose";

const pollOptionSchema = new Schema(
    {
        text: { type: String, required: true, trim: true },
        votes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    { _id: true }
);

const communityPostSchema = new Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            trim: true,
            default: "",
        },
        image: {
            type: String,   // Cloudinary URL (optional)
            default: null,
        },
        imagePublicId: {
            type: String,
            default: null,
        },
        type: {
            type: String,
            enum: ["text", "image", "poll"],
            required: true,
            default: "text",
        },
        poll: {
            question: { type: String, trim: true },
            options: [pollOptionSchema],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const CommunityPost = mongoose.model("CommunityPost", communityPostSchema);
export default CommunityPost;
