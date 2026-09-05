const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");

const {
  createCall,
  getCalls,
  getCallById,
  updateCall,
  deleteCall,
  recordingCallback,
  streamRecording,
} = require("../controllers/callController");

// ================================
// Recording webhook (Twilio calls this, no auth)
// ================================
router.post("/api/calls/recording-callback", recordingCallback);

// ================================
// Stream recording audio (auth via ?token=)
// ================================
router.get("/api/calls/:id/recording", validateObjectId(), streamRecording);

// ================================
// Existing Call Routes
// ================================
router.post("/api/calls", auth, createCall);

router.get("/api/calls", auth, getCalls);

router.get("/api/calls/:id", auth, validateObjectId(), getCallById);

router.put("/api/calls/:id", auth, validateObjectId(), updateCall);

router.delete("/api/calls/:id", auth, validateObjectId(), deleteCall);

module.exports = router;