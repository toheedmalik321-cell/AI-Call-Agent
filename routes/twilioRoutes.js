const auth = require("../middlewares/auth");
const express = require("express");

const router = express.Router();

const {

    startCall,

    incomingCall,

    processSpeech

} = require("../controllers/twilioController");

router.post("/start-call", auth, startCall);

router.post("/voice", incomingCall);

router.post("/process-speech", processSpeech);

module.exports = router;