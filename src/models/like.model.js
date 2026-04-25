import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
    {
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
            default: null,
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },
        communityPost: {
            type: Schema.Types.ObjectId,
            ref: "CommunityPost",
            default: null,
        },
        likedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// Prevent duplicate likes
likeSchema.index({ video: 1, likedBy: 1 }, { unique: true, sparse: true });
likeSchema.index({ comment: 1, likedBy: 1 }, { unique: true, sparse: true });
likeSchema.index({ communityPost: 1, likedBy: 1 }, { unique: true, sparse: true });

const Like = mongoose.model("Like", likeSchema);
export default Like;
