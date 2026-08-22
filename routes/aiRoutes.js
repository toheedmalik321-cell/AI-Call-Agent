const express = require("express");
const router = express.Router();


const auth = require("../middlewares/auth");
const {
  chatWithAI,
  getChatHistory,
  deleteChat,
} = require("../controllers/aiController");
router.delete("/ai/history/:id", auth, deleteChat);

// AI Chat Route
router.post("/ai/chat", auth, chatWithAI);
router.get("/ai/history", auth, getChatHistory);
module.exports = router;