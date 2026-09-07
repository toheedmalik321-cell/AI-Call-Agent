const { APP_ID, generateRtcToken, startAgoraCall, processAgoraTurn, endAgoraCall } = require("../services/agoraService");

// ===============================
// Get Agora config (appId + channel) for client
// ===============================

const getAgoraConfig = async (req, res) => {

    if (!APP_ID) {

        return res.status(400).json({
            success: false,
            message: "Agora is not configured. Set AGORA_APP_ID in environment variables."
        });

    }

    const channelName = "ai-call-" + req.user.id + "-" + Date.now();

    return res.json({
        success: true,
        data: {
            appId: APP_ID,
            channelName,
            uid: 0
        }
    });

};

// ===============================
// Get Agora RTC token to join a channel
// ===============================

const getRtcToken = async (req, res) => {

    const { channelName, uid } = req.body;

    if (!channelName) {

        return res.status(400).json({
            success: false,
            message: "channelName is required"
        });

    }

    if (!APP_ID || !process.env.AGORA_APP_CERTIFICATE) {

        return res.status(400).json({
            success: false,
            message: "Agora is not configured. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE."
        });

    }

    const token = generateRtcToken(channelName, uid || 0);

    return res.json({
        success: true,
        data: {
            token,
            appId: APP_ID,
            channelName
        }
    });

};

// ===============================
// Start an AI voice call
// ===============================

const startCall = async (req, res) => {

    const { customerName, phoneNumber, channelName, role } = req.body;

    try {

        const result = await startAgoraCall(req.user.id, {
            customerName,
            phoneNumber,
            channelName,
            role
        });

        if (!result.success) {

            return res.status(400).json(result);

        }

        return res.json(result);

    } catch (err) {

        console.error("agora startCall error:", err.message);

        return res.status(500).json({
            success: false,
            message: "Failed to start call"
        });

    }

};

// ===============================
// Process a spoken turn
// ===============================

const handleTurn = async (req, res) => {

    const { callId, speech } = req.body;

    if (!callId || !speech) {

        return res.status(400).json({
            success: false,
            message: "callId and speech are required"
        });

    }

    try {

        const result = await processAgoraTurn(req.user.id, callId, speech);

        if (!result.success) {

            return res.status(400).json(result);

        }

        return res.json(result);

    } catch (err) {

        console.error("agora turn error:", err.message);

        return res.status(500).json({
            success: false,
            message: "Failed to process speech"
        });

    }

};

// ===============================
// End a call
// ===============================

const endCall = async (req, res) => {

    const { callId } = req.body;

    if (!callId) {

        return res.status(400).json({
            success: false,
            message: "callId is required"
        });

    }

    try {

        const result = await endAgoraCall(callId);

        if (!result.success) {

            return res.status(400).json(result);

        }

        return res.json(result);

    } catch (err) {

        console.error("agora endCall error:", err.message);

        return res.status(500).json({
            success: false,
            message: "Failed to end call"
        });

    }

};

module.exports = {
    getAgoraConfig,
    getRtcToken,
    startCall,
    handleTurn,
    endCall
};