import crypto from "crypto";
import View from "../models/view.model.js";
import Video from "../models/video.model.js";

/**
 * How long after a view we wait before counting another one from the same
 * user/fingerprint. 30 minutes mirrors common platform behavior.
 */
const COOLDOWN_MS = 30 * 60 * 1000;

/**
 * Hash IP + user-agent so we can dedupe anonymous viewers without storing
 * raw PII in the database.
 */
function fingerprintAnonymous(ip, userAgent) {
    if (!ip) return null;
    return crypto
        .createHash("sha256")
        .update(`${ip}|${userAgent || ""}`)
        .digest("hex");
}

/**
 * Conditionally records a view and increments Video.views.
 *
 * - If the viewer (logged-in user OR anon fingerprint) has a View doc for
 *   this video newer than COOLDOWN_MS, do nothing (return counted: false).
 * - Otherwise insert a fresh View doc and atomically `$inc: { views: 1 }`.
 *
 * Safe to call on every getVideoById — repeated calls within the cooldown
 * are no-ops.
 *
 * @returns {Promise<{ counted: boolean, views: number }>}
 *   `counted` indicates whether this call bumped the counter.
 *   `views`   is the current Video.views value (post-increment if counted).
 */
export async function registerView({ videoId, userId, ip, userAgent }) {
    const cutoff = new Date(Date.now() - COOLDOWN_MS);

    let recent;
    let fingerprint = null;

    if (userId) {
        recent = await View.findOne({
            video: videoId,
            viewer: userId,
            createdAt: { $gte: cutoff },
        }).lean();
    } else {
        fingerprint = fingerprintAnonymous(ip, userAgent);
        if (fingerprint) {
            recent = await View.findOne({
                video: videoId,
                fingerprint,
                createdAt: { $gte: cutoff },
            }).lean();
        }
    }

    if (recent) {
        // Within cooldown — read the current count without bumping
        const v = await Video.findById(videoId).select("views").lean();
        return { counted: false, views: v?.views ?? 0 };
    }

    // First view (or after cooldown). Record + atomically bump.
    await View.create({
        video: videoId,
        viewer: userId || null,
        fingerprint: userId ? null : fingerprint,
    });

    const updated = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } },
        { new: true, projection: { views: 1 } }
    ).lean();

    return { counted: true, views: updated?.views ?? 0 };
}
