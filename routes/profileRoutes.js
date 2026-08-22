const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth");

const {

    getProfile,

    updateProfile,

    changePassword

} = require("../controllers/profileController");

router.get("/api/profile", auth, getProfile);

router.put("/api/profile", auth, updateProfile);
router.put("/api/change-password", auth, changePassword);

module.exports = router;