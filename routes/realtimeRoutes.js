const express = require("express");
const router = express.Router();

const {
    createRealtimeSession
} = require("../controllers/realtimeController");

router.get("/api/realtime-session", createRealtimeSession);

module.exports = router;