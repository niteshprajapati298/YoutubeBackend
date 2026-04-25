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

// Prevent duplicate likes — partialFilterExpression ensures the index only applies
// when the field is an actual ObjectId, so null values don't collide across documents
likeSchema.index(
    { video: 1, likedBy: 1 },
    { unique: true, partialFilterExpression: { video: { $type: "objectId" } } }
);
likeSchema.index(
    { comment: 1, likedBy: 1 },
    { unique: true, partialFilterExpression: { comment: { $type: "objectId" } } }
);
likeSchema.index(
    { communityPost: 1, likedBy: 1 },
    { unique: true, partialFilterExpression: { communityPost: { $type: "objectId" } } }
);

const Like = mongoose.model("Like", likeSchema);
export default Like;
