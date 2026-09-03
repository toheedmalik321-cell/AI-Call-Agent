const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
{
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Agent",
        required: true
    },

    customerName: {
        type: String,
        default: "Unknown Customer"
    },

    phoneNumber: {
        type: String,
        required: true
    },

    customerMessage: {
        type: String,
        default: ""
    },

    aiReply: {
        type: String,
        default: ""
    },

    transcript: {
        type: String,
        default: ""
    },

    callSummary: {
        type: String,
        default: ""
    },

    // ==========================
    // Twilio Call Recording
    // ==========================

    twilioCallSid: {
        type: String,
        default: ""
    },

    recordingSid: {
        type: String,
        default: ""
    },

    recordingUrl: {
        type: String,
        default: ""
    },

    status: {
        type: String,
        enum: [
            "pending",
            "calling",
            "completed",
            "failed"
        ],
        default: "pending"
    },

    duration: {
        type: Number,
        default: 0
    },

    startedAt: {
        type: Date,
        default: Date.now
    },

    endedAt: {
        type: Date
    }

},
{
    timestamps: true
});

module.exports = mongoose.model("Call", callSchema);