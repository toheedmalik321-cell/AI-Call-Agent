const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");

const {
    chatWithAI,
    getChatHistory,
    createChatSession,
    getChatSessions,
    getSingleChatHistory,
    deleteChatSession
} = require("../controllers/aiController");

// ===============================
// Chat Sessions
// ===============================

// Create New Chat
router.post("/api/chat/session", auth, createChatSession);

// Get All Chats
router.get("/api/chat/sessions", auth, getChatSessions);

// Get One Chat History
router.get("/api/chat/history/:sessionId", auth, getSingleChatHistory);
// Delete Chat Session
router.delete("/api/chat/session/:sessionId", auth, deleteChatSession);

// ===============================
// AI Chat
// ===============================

router.post("/api/chat", auth, chatWithAI);

// Old History (temporary)
router.get("/ai/history", auth, getChatHistory);

module.exports = router;