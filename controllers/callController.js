
const Call = require("../models/call");
const Agent = require("../models/agent");
const jwt = require("jsonwebtoken");
const { generateAIResponse } = require("../services/aiService");

// ===================================
// Create AI Call
// ===================================

const createCall = async (req, res) => {

    try {

        const {
            customerName,
            phoneNumber,
            customerMessage
        } = req.body;

        if (!customerMessage || !customerMessage.toString().trim()) {
            return res.status(400).json({
                success: false,
                message: "Customer message is required"
            });
        }

        if (!phoneNumber || !phoneNumber.toString().trim()) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        // Active Agent
        const agent = await Agent.findOne({
            user: req.user.id,
            isActive: true
        });

        if (!agent) {

            return res.status(404).json({
                success: false,
                message: "No Active Agent Found"
            });

        }

        // Call Start Time
        const startTime = new Date();

        // AI Reply
        const aiReply = await generateAIResponse(
    customerMessage,
    agent.role,
    req.user.id
);

        // Call End Time
        const endTime = new Date();

        // Duration (Seconds)
        const duration = Math.floor(
            (endTime - startTime) / 1000
        );

        // Transcript
        const transcript = `

Customer:
${customerMessage}

AI:
${aiReply}

`;

        // Summary
        const callSummary =
            customerMessage.length > 150
                ? customerMessage.substring(0, 150) + "..."
                : customerMessage;

        // Save
       const call = await Call.create({

    user: req.user.id,

    agent: agent._id,

    customerName,

    phoneNumber,

    customerMessage,

    aiReply,

    transcript,

    callSummary,

    status: "completed",

    duration,

    startedAt: startTime,

    endedAt: endTime

});

res.status(201).json({

    success: true,

    message: "AI Call Completed Successfully!",

    data: call

});
    }

    catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};
// ===================================
// Get All Calls
// ===================================

const getCalls = async (req, res) => {

    try {

        const calls = await Call.find({

            user: req.user.id

        })

        .populate("agent", "companyName role")

        .sort({

            createdAt: -1

        });

        res.status(200).json({

            success: true,

            totalCalls: calls.length,

            data: calls

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// ===================================
// Get Single Call
// ===================================

const getCallById = async (req, res) => {

    try {

        const call = await Call.findOne({

            _id: req.params.id,

            user: req.user.id

        })

        .populate("agent", "companyName role");

        if (!call) {

            return res.status(404).json({

                success: false,

                message: "Call not found"

            });

        }

        res.status(200).json({

            success: true,

            data: call

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// ===================================
// Update Call
// ===================================

const updateCall = async (req, res) => {

    try {

        const call = await Call.findOneAndUpdate(

            {

                _id: req.params.id,

                user: req.user.id

            },

            req.body,

            {

                new: true

            }

        );

        if (!call) {

            return res.status(404).json({

                success: false,

                message: "Call not found"

            });

        }

        res.status(200).json({

            success: true,

            message: "Call Updated Successfully!",

            data: call

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// ===================================
// Delete Call
// ===================================

const deleteCall = async (req, res) => {

    try {

        const call = await Call.findOneAndDelete({

            _id: req.params.id,

            user: req.user.id

        });

        if (!call) {

            return res.status(404).json({

                success: false,

                message: "Call not found"

            });

        }

        res.status(200).json({

            success: true,

            message: "Call Deleted Successfully!"

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// ===================================
// Recording Callback (Twilio webhook)
// ===================================

const recordingCallback = async (req, res) => {

    try {

        const callSid =
            req.body.CallSid || req.body.callSid || "";

        const recordingUrl =
            req.body.RecordingUrl || req.body.recordingUrl || "";

        const recordingSid =
            req.body.RecordingSid || req.body.recordingSid || "";

        console.log("Recording callback ->", {
            callSid,
            recordingUrl,
            recordingSid
        });

        if (!callSid || !recordingUrl) {

            return res.status(400).json({
                success: false,
                message: "Missing CallSid or RecordingUrl"
            });

        }

        // Match the call by Twilio CallSid
        const call = await Call.findOne({
            twilioCallSid: callSid
        });

        if (!call) {

            return res.status(404).json({
                success: false,
                message: "Call not found for this CallSid"
            });

        }

        call.recordingUrl = recordingUrl;
        call.recordingSid = recordingSid || call.recordingSid;
        await call.save();

        console.log("Recording saved for call:", call._id);

    // Twilio expects an empty 200/204 response
    res.status(200).json({
        success: true,
        message: "Recording saved"
    });

    } catch (err) {

        console.log("Recording callback error:", err.message);
        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};

// ===================================
// Stream Recording (audio proxy for browser playback)
// ===================================

const streamRecording = async (req, res) => {

    try {

        // Auth via token query param (audio element can't set headers)
        const token = req.query.token || "";

        let userId = null;

        try {

            const verified = jwt.verify(token, process.env.JWT_SECRET);
            userId = verified.id;

        } catch (e) {

            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });

        }

        const call = await Call.findOne({
            _id: req.params.id,
            user: userId
        });

        if (!call) {
            return res.status(404).json({
                success: false,
                message: "Call not found"
            });
        }

        if (!call.recordingUrl) {
            return res.status(404).json({
                success: false,
                message: "No recording available"
            });
        }

        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            return res.status(500).json({
                success: false,
                message: "Twilio not configured"
            });
        }

        const twilio = require("twilio");

        const jsonClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );

        // recordingUrl looks like "/2010-04-01/Accounts/ACxxx/Recordings/RE..."
        // Twilio serves media at the same path with .mp3 extension
        let mediaUrl = call.recordingUrl;
        if (!/^https?:/i.test(mediaUrl)) {
            mediaUrl = "https://api.twilio.com" + mediaUrl;
        }
        mediaUrl = mediaUrl + ".mp3";

        const fetch = global.fetch || require("node-fetch");

        const upstream = await fetch(mediaUrl, {
            headers: {
                Authorization:
                    "Basic " +
                    Buffer.from(
                        process.env.TWILIO_ACCOUNT_SID + ":" + process.env.TWILIO_AUTH_TOKEN
                    ).toString("base64")
            }
        });

        if (!upstream.ok) {
            return res.status(upstream.status).json({
                success: false,
                message: "Failed to fetch recording from Twilio"
            });
        }

        const contentType = upstream.headers.get("content-type") || "audio/mpeg";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Length", upstream.headers.get("content-length") || "");
        res.setHeader("Cache-Control", "no-store");

        const buffer = Buffer.from(await upstream.arrayBuffer());
        return res.send(buffer);

    } catch (err) {

        console.log("Stream recording error:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

};

module.exports = {

    createCall,

    getCalls,

    getCallById,

    updateCall,

    deleteCall,

    recordingCallback,

    streamRecording

};