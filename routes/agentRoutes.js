const express = require("express");
const router = express.Router();

console.log("✅ Agent Routes Loaded");

const auth = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");

const {
    createAgent,
    getAgents,
    getSingleAgent,
    updateAgent,
    deleteAgent,
    setActiveAgent
} = require("../controllers/agentController");

// ===============================
// Create Agent
// ===============================

router.post("/agent", auth, createAgent);

// ===============================
// Get All Agents
// ===============================

router.get("/agent", auth, getAgents);

// ===============================
// Get Single Agent
// ===============================

router.get("/agent/:id", auth, validateObjectId(), getSingleAgent);

// ===============================
// Update Agent
// ===============================

router.put("/agent/:id", auth, validateObjectId(), updateAgent);

// ===============================
// Delete Agent
// ===============================

router.delete("/agent/:id", auth, validateObjectId(), deleteAgent);

// ===============================
// Set Active Agent
// ===============================

router.put("/agent/active/:id", auth, validateObjectId(), setActiveAgent);

module.exports = router;