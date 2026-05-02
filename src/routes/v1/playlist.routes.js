import { Router } from "express";
import {
    createPlaylist, getPlaylistById, updatePlaylist, deletePlaylist,
    addVideoToPlaylist, removeVideoFromPlaylist, getUserPlaylists,
} from "../../controllers/playlist.controller.js";
import { authenticateUser } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/user/:userId", getUserPlaylists);           // public
router.get("/:playlistId", getPlaylistById);             // public

router.use(authenticateUser);                            // below requires auth

router.post("/", createPlaylist);
router.put("/:playlistId", updatePlaylist);
router.delete("/:playlistId", deletePlaylist);
router.post("/add/:videoId/:playlistId", addVideoToPlaylist);
router.delete("/remove/:videoId/:playlistId", removeVideoFromPlaylist);

export default router;
