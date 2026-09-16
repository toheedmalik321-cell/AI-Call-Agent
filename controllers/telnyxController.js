const Agent = require("../models/agent");
const Call = require("../models/call");
const { generateAIResponse, generateCallSummary } = require("../services/aiService");
const telnyx = require("../services/telnyxService");

// ==========================================
// Active call sessions (streamId -> context)
// used by the media-stream WebSocket handler
// ==========================================

const activeCalls = new Map();

const END_WORDS = [
    "bye", "goodbye", "good bye", "see you", "that's all", "thanks bye",
    "thank you bye", "end call", "hang up", "hangup", "disconnect", "stop"
];

const START_PROMPT = `You are starting a new phone conversation with a customer.
Important instructions:
- Introduce only the company name given in your context.
- Do NOT invent a name for yourself and never output placeholder text or brackets.
- Say a short greeting (1-2 sentences) as a helpful assistant, then ask one simple opening question.`;

const wsUrl = () => {
    const base = telnyx.getBaseUrl();
    return (base.startsWith("https") ? "wss://" : "ws://") + base.replace(/^https?:\/\//, "") + "/telnyx/media-stream";
};

// ==========================================
// Start Call (browser -> phone)
// ==========================================

const startCall = async (req, res) => {
    try {
        if (!telnyx.hasTelnyx()) {
            return res.status(404).json({
                success: false,
                code: "NO_TELNYX",
                message: "Telnyx not configured yet"
            });
        }

        const to = (req.body && req.body.to) || process.env.MY_PHONE_NUMBER || "";
        const from = process.env.TELNYX_PHONE_NUMBER;

        if (!to) {
            return res.status(400).json({ success: false, message: "Destination number missing" });
        }

        const result = await telnyx.makeOutboundCall({
            to,
            from,
            userId: req.user.id,
            callId: ""
        });

        console.log("Telnyx call created:", result.call_control_id);

        return res.json({
            success: true,
            message: "Call ringing " + to,
            callControlId: result.call_control_id || ""
        });

    } catch (err) {
        console.error("Telnyx start-call error:", err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// Incoming webhook (call events)
// ==========================================

const webhook = async (req, res) => {
    // Always ack immediately; heavy work runs async
    res.status(200).json({});

    try {
        const evt = telnyx.parseWebhook(req.body);
        console.log("Telnyx event:", evt.eventType, evt.callControlId);

        if (!evt.callControlId) return;

        if (evt.eventType === "call.answered") {
            await onAnswered(evt);
        } else if (evt.eventType === "call.hangup") {
            await onHangup(evt);
        }
    } catch (err) {
        console.error("Telnyx webhook error:", err.message);
    }
};

const onAnswered = async (evt) => {
    try {
        const userId = evt.customHeaders["X-User-Id"] || evt.customHeaders["X-UserId"] || "";

        // Locate the active agent for this user (or the first active agent)
        let agent = null;
        if (userId) {
            agent = await Agent.findOne({ user: userId, isActive: true });
        }
        if (!agent) {
            agent = await Agent.findOne({ isActive: true });
        }

        if (!agent) {
            await telnyx.sendSpeak(evt.callControlId, "Sorry, no active AI agent is available right now.");
            setTimeout(() => telnyx.sendHangup(evt.callControlId).catch(() => {}), 3500);
            return;
        }

        const call = await Call.create({
            user: agent.user,
            agent: agent._id,
            customerName: "Phone Customer",
            phoneNumber: evt.to || process.env.TELNYX_PHONE_NUMBER || "",
            transcript: "",
            provider: "telnyx",
            telnyxCallControlId: evt.callControlId,
            telnyxCallSessionId: evt.callSessionId,
            status: "calling",
            startedAt: new Date()
        });

        const role = agent.role || "receptionist";
        const greeting = await generateAIResponse(START_PROMPT, role, agent.user.toString(), null, "", "call");

        console.log("Telnyx greeting:", greeting);

        await Call.findByIdAndUpdate(call._id, {
            transcript: "AI:\n" + greeting + "\n\n"
        });

        const streamId = "ai-" + call._id.toString();

        activeCalls.set(streamId, {
            userId: agent.user.toString(),
            callId: call._id.toString(),
            callControlId: evt.callControlId,
            role,
            companyName: agent.companyName,
            voice: "female"
        });

        // Speak the greeting (Telnyx accepts "female"/"male" generic voices), then open the media stream for STT
        await telnyx.sendSpeak(evt.callControlId, greeting, "female");
        await telnyx.sendMediaStreamStart(evt.callControlId, streamId, wsUrl());

    } catch (err) {
        console.error("Telnyx onAnswered error:", err.message);
    }
};

const onHangup = async (evt) => {
    try {
        // Find the call by call-control id and finish any open session
        const call = await Call.findOne({
            provider: "telnyx",
            telnyxCallControlId: evt.callControlId
        });

        if (!call) return;

        for (const [key, value] of activeCalls.entries()) {
            if (value.callControlId === evt.callControlId) activeCalls.delete(key);
        }

        if (call.status === "completed") return;

        const duration = Math.round((Date.now() - new Date(call.startedAt).getTime()) / 1000);

        await Call.findByIdAndUpdate(call._id, {
            status: "completed",
            endedAt: new Date(),
            duration
        });

    } catch (err) {
        console.error("Telnyx onHangup error:", err.message);
    }
};

// ==========================================
// AI turn (called from the WebSocket after STT)
// ==========================================

const processTurn = async (text, ctx) => {
    try {
        const { callId, callControlId, userId, streamId, role } = ctx;

        // End-of-call detection
        const lower = (text || "").toLowerCase();
        const shouldEnd = END_WORDS.some((w) => lower.includes(w));

        const call = await Call.findById(callId);
        if (!call) return;

        const previousTranscript = call.transcript || "";

        if (shouldEnd) {
            const goodbye = await generateAIResponse(text, role, userId, null, previousTranscript, "call");

            const updatedTranscript = previousTranscript + `\n\nCustomer:\n${text}\n\nAI:\n${goodbye}\n\n`;
            const duration = Math.round((Date.now() - new Date(call.startedAt).getTime()) / 1000);

            await Call.findByIdAndUpdate(callId, {
                transcript: updatedTranscript,
                customerMessage: text,
                aiReply: goodbye,
                status: "completed",
                endedAt: new Date(),
                duration
            });

            generateCallSummary(updatedTranscript, ctx.companyName, role)
                .then((summary) => Call.findByIdAndUpdate(callId, { callSummary: summary }))
                .catch((e) => console.error("Telnyx summary error:", e.message));

            await telnyx.sendSpeak(callControlId, goodbye, "female");
            setTimeout(() => telnyx.sendHangup(callControlId).catch(() => {}), goodbye.length * 80 + 1500);

            activeCalls.delete(streamId);

        } else {
            const aiReply = await generateAIResponse(text, role, userId, null, previousTranscript, "call");

            const updatedTranscript = previousTranscript + `\n\nCustomer:\n${text}\n\nAI:\n${aiReply}\n\n`;
            const duration = Math.round((Date.now() - new Date(call.startedAt).getTime()) / 1000);

            await Call.findByIdAndUpdate(callId, {
                transcript: updatedTranscript,
                customerMessage: text,
                aiReply,
                callSummary: updatedTranscript.substring(0, 1000),
                duration
            });

            await telnyx.sendSpeak(callControlId, aiReply, "female");
        }

    } catch (err) {
        console.error("Telnyx processTurn error:", err.message);
    }
};

module.exports = {
    activeCalls,
    startCall,
    webhook,
    onAnswered,
    onHangup,
    processTurn
};