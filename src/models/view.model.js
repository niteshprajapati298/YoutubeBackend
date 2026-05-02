import mongoose, { Schema } from "mongoose";

/**
 * Tracks individual view events so we can dedupe re-watches within a
 * cooldown window. The Video.views counter is still the source of truth for
 * display; this collection only exists to decide whether the next call to
 * getVideoById should bump that counter.
 *
 * Documents auto-expire after 90 days (TTL index) so the collection grows
 * with recent engagement, not with full history.
 */
const viewSchema = new Schema(
    {
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
            required: true,
        },
        // For logged-in viewers. Null/absent for anonymous viewers.
        viewer: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        // sha256(ip + '|' + userAgent) for anonymous dedup. Null for logged-in
        // viewers (we use `viewer` instead).
        fingerprint: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

// Fast lookup: "did this user view this video recently?"
viewSchema.index({ video: 1, viewer: 1, createdAt: -1 });
// Same lookup path for anonymous viewers
viewSchema.index({ video: 1, fingerprint: 1, createdAt: -1 });
// TTL — purge view records after 90 days. Video.views counter is unaffected.
viewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

const View = mongoose.model("View", viewSchema);
export default View;
