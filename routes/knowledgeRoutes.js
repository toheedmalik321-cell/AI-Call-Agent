const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const {
    uploadKnowledge,
    getKnowledge,
    deleteKnowledge,
    makeActiveKnowledge
} = require("../controllers/knowledgeController");

// Upload PDF
router.post("/api/knowledge", auth, upload.single("file"), uploadKnowledge);

// Get PDFs
router.get("/api/knowledge", auth, getKnowledge);

// Delete PDF
router.delete("/api/knowledge/:id", auth, deleteKnowledge);
// Make Active PDF
router.put("/api/knowledge/:id/active", auth, makeActiveKnowledge);
module.exports = router;