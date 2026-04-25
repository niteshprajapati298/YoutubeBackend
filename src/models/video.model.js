
import mongoose, { Schema } from "mongoose";

const videoSchema = new Schema({
    videoFile: {
        type: String, // cloudinary url
        required: true,
        unique: true,
    },
    videoFilePublicId: {
        type: String,
        default: "",
    },
    thumbnail: {
        type: String,    // cloudinary url
        required: true,
        unique: true,
    },
    thumbnailPublicId: {
        type: String,
        default: "",
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    duration: {
        type: Number,  // from cloudinary url
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean
    },
    isActive:{
        type:Boolean,
        default:true
    }

}, {
    timestamps: true
})
const Video = mongoose.model('Video', videoSchema);
export default Video;
