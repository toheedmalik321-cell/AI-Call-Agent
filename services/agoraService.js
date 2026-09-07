const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const { GoogleGenAI } = require("@google/genai");

const Agent = require("../models/agent");
const Call = require("../models/call");
const { generateAIResponse, generateCallSummary } = require("./aiService");

// ===============================
// Agora Config
// ===============================

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

// ===============================
// Generate RTC Token (client joins channel)
// ===============================

const generateRtcToken = (channelName, uid, expiresInSeconds = 3600) => {

    if (!APP_ID || !APP_CERTIFICATE) {
        return null;
    }

    const role = RtcRole.PUBLISHER;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expiresInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        uid,
        role,
        privilegeExpiredTs
    );

    return token;

};

// ===============================
// Get active agent for a user
// ===============================

const getActiveAgent = async (userId) => {

    try {

        const agent = await Agent.findOne({
            user: userId,
            isActive: true,
        });

        return agent;

    } catch (err) {

        console.error("getActiveAgent error:", err.message);
        return null;

    }

};

// ===============================
// Start an AI voice call (create call record + greeting)
// ===============================

const startAgoraCall = async (userId, { customerName, phoneNumber, channelName, role }) => {

    const agent = await getActiveAgent(userId);

    if (!agent) {

        return {
            success: false,
            message: "Please activate an AI Agent first."
        };

    }

    // Generate greeting from the agent's perspective
    const greeting = await generateAIResponse(
        `You are starting a new phone conversation with a customer. Open the call naturally and warmly.

Important instructions:
- Introduce only the company "${agent.companyName}".
- Do NOT invent a name for yourself, and do NOT use placeholder words like [Your Name], [name], [company], or any brackets.
- Never output placeholder text of any kind.

Say a short greeting (1-2 sentences) as a helpful assistant representing "${agent.companyName}", then ask one simple opening question, like how you can help them today.`,
        agent.role,
        userId,
        null,
        null
    );

    // Create the call record right away
    const call = await Call.create({
        user: userId,
        agent: agent._id,
        customerName: customerName || "Unknown Customer",
        phoneNumber: phoneNumber || "agora-room",
        customerMessage: role || "receptionist",
        aiReply: greeting,
        transcript: "AI:\n" + greeting + "\n\n",
        callSummary: "",
        status: "calling",
        startedAt: new Date()
    });

    return {
        success: true,
        callId: call._id.toString(),
        agent: {
            name: agent.companyName,
            role: agent.role,
            voice: agent.voice
        },
        greeting
    };

};

// ===============================
// Process a spoken turn during a call
// ===============================

const processAgoraTurn = async (userId, callId, speech) => {

    const agent = await getActiveAgent(userId);

    if (!agent) {

        return {
            success: false,
            message: "Please activate an AI Agent first."
        };

    }

    const call = await Call.findById(callId);

    if (!call) {

        return {
            success: false,
            message: "Call not found"
        };

    }

    const previousTranscript = call.transcript || "";
    const text = speech.trim();

    // End-of-call detection
    const endWords = ["bye", "goodbye", "good bye", "see you", "that's all", "thanks bye", "thank you bye", "end call", "hang up"];

    const shouldEnd = endWords.some(w => text.toLowerCase().includes(w));

    if (shouldEnd) {

        // Generate goodbye + summary
        const goodbye = await generateAIResponse(
            text,
            agent.role,
            userId,
            null,
            previousTranscript
        );

        let aiSummary = "";

        try {

            const updatedForSummary = `${previousTranscript}\n\nCustomer:\n${text}\n\nAI:\n${goodbye}`;
            aiSummary = await generateCallSummary(updatedForSummary);

        } catch (e) {

            console.error("summary error:", e.message);

        }

        const updatedTranscript = `${previousTranscript}\n\nCustomer:\n${text}\n\nAI:\n${goodbye}\n\n`;
        const duration = Math.round((Date.now() - new Date(call.startedAt).getTime()) / 1000);

        await Call.findByIdAndUpdate(call._id, {
            transcript: updatedTranscript,
            callSummary: aiSummary,
            customerMessage: text,
            aiReply: goodbye,
            status: "completed",
            endedAt: new Date(),
            duration
        });

        return {
            success: true,
            endCall: true,
            reply: goodbye,
            summary: aiSummary,
            status: "completed"
        };

    }

    // Normal turn
    const aiReply = await generateAIResponse(
        text,
        agent.role,
        userId,
        null,
        previousTranscript
    );

    const updatedTranscript = `${previousTranscript}\n\nCustomer:\n${text}\n\nAI:\n${aiReply}\n\n`;
    const duration = Math.round((Date.now() - new Date(call.startedAt).getTime()) / 1000);

    await Call.findByIdAndUpdate(call._id, {
        transcript: updatedTranscript,
        customerMessage: text,
        aiReply: aiReply,
        callSummary: updatedTranscript.substring(0, 1000),
        duration
    });

    return {
        success: true,
        endCall: false,
        reply: aiReply
    };

};

// ===============================
// Finalize a call (mark completed)
// ===============================

const endAgoraCall = async (callId) => {

    const call = await Call.findById(callId);

    if (!call) {

        return { success: false, message: "Call not found" };

    }

    const now = new Date();

    if (call.status !== "completed") {

        await Call.findByIdAndUpdate(call._id, {
            status: "completed",
            endedAt: now
        });

    }

    return { success: true };

};

module.exports = {
    APP_ID,
    generateRtcToken,
    startAgoraCall,
    processAgoraTurn,
    endAgoraCall
};