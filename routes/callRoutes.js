const express = require("express");
const router = express.Router();
const twilio = require("twilio");

const auth = require("../middlewares/auth");

const {
  createCall,
  getCalls,
  getCallById,
  updateCall,
  deleteCall,
} = require("../controllers/callController");

// ================================
// Twilio Incoming Voice Webhook
// ================================
router.get("/voice", (req, res) => {

  const twiml = new twilio.twiml.VoiceResponse();

  twiml.say(
    {
      voice: "alice",
    },
    "Hello. Welcome to AI Call Hub. Your AI assistant is now connected."
  );

  res.type("text/xml");
  res.send(twiml.toString());

});
router.post("/voice", (req, res) => {

  const twiml = new twilio.twiml.VoiceResponse();

  twiml.say(
    {
      voice: "alice",
    },
    "Hello. Welcome to AI Call Hub. Your AI assistant is now connected."
  );

  res.type("text/xml");
  res.send(twiml.toString());

});

// ================================
// Existing Call Routes
// ================================
router.post("/api/calls", auth, createCall);

router.get("/api/calls", auth, getCalls);

router.get("/api/calls/:id", auth, getCallById);

router.put("/api/calls/:id", auth, updateCall);

router.delete("/api/calls/:id", auth, deleteCall);

module.exports = router;