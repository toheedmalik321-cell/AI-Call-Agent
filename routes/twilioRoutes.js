const auth = require("../middlewares/auth");
const express = require("express");

const router = express.Router();

const {

    startCall,

    incomingCall,

    processSpeech

} = require("../controllers/twilioController");

router.post("/start-call", auth, startCall);

// Incoming voice webhook — Twilio posts to /voice (callRoutes wala duplicate hata diya)
router.route("/voice").post(incomingCall);

router.post("/process-speech", processSpeech);

module.exports = router;