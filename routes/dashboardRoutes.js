
const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");

const {
    getDashboard
} = require("../controllers/dashboardController");

// Dashboard API
router.get("/api/dashboard", auth, getDashboard);

module.exports = router;