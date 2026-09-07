const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");

const {
    getAgoraConfig,
    getRtcToken,
    startCall,
    handleTurn,
    endCall
} = require("../controllers/agoraController");

// Get Agora appId + a fresh channel
router.get("/api/agora/config", auth, getAgoraConfig);

// Get an RTC token to join a channel
router.post("/api/agora/token", auth, getRtcToken);

// Start an AI voice call (creates Call record + greeting)
router.post("/api/agora/call/start", auth, startCall);

// Process a spoken turn
router.post("/api/agora/call/turn", auth, handleTurn);

// End a call
router.post("/api/agora/call/end", auth, endCall);

module.exports = router;