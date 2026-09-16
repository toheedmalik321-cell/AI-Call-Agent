const { GoogleGenAI } = require("@google/genai");

// ==========================================
// Telnyx Call Control / Voice API client
// ==========================================

const API_BASE = "https://api.telnyx.com/v2";

const getApiKey = () => process.env.TELNYX_API_KEY || "";
const getConnectionId = () => process.env.TELNYX_CONNECTION_ID || "";
const getBaseUrl = () => process.env.TELNYX_WEBHOOK_URL || "https://ai-call-agent-qlee.onrender.com";

const hasTelnyx = () => Boolean(getApiKey() && getConnectionId() && process.env.TELNYX_PHONE_NUMBER);

const api = async (method, path, body) => {
    const res = await fetch(API_BASE + path, {
        method,
        headers: {
            Authorization: "Bearer " + getApiKey(),
            "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error((json && json.errors && json.errors[0] && json.errors[0].detail) || `Telnyx API ${res.status}`);
    }
    return json;
};

// ==========================================
// Outbound call (browser -> customer phone)
// ==========================================

const makeOutboundCall = async ({ to, from, userId, callId }) => {
    const body = {
        connection_id: getConnectionId(),
        to,
        from,
        // We return a small JSON array so the call starts even before events
        webhook_url: getBaseUrl() + "/telnyx/incoming",
        webhook_url_method: "POST",
        custom_headers: [
            { name: "X-User-Id", value: String(userId || "") },
            { name: "X-Call-Id", value: String(callId || "") }
        ]
    };
    const json = await api("POST", "/calls", body);
    return (json && json.data) || {};
};

// ==========================================
// Call Control commands
// ==========================================

const sendSpeak = (callControlId, text, voice) => {
    return api("POST", `/calls/${callControlId}/actions/speak`, {
        text: String(text || "").substring(0, 400),
        voice: voice || "female",
        payload_type: "none",
        loop: 0
    });
};

const sendHangup = (callControlId) => {
    return api("POST", `/calls/${callControlId}/actions/hangup`, {});
};

const sendMediaStreamStart = (callControlId, streamId, wsUrl) => {
    return api("POST", `/calls/${callControlId}/actions/media_stream_start`, {
        stream_id: streamId,
        ws_url: wsUrl,
        audio_format: "RAW",
        use_stream_vad: true,
        track: "both"
    });
};

const sendMediaStreamStop = (callControlId, streamId) => {
    return api("POST", `/calls/${callControlId}/actions/media_stream_stop`, {
        stream_id: streamId
    });
};

// ==========================================
// Transcribe audio (raw PCM chunks) via Gemini
// ==========================================

const buildWavBase64 = (pcmChunks) => {
    // Merge raw signed 16-bit PCM (8kHz mono) into a WAV file
    const pcm = Buffer.concat(pcmChunks);
    const sampleRate = 8000;
    const channels = 1;
    const bits = 16;
    const dataSize = pcm.length;
    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * channels * bits / 8, 28);
    header.writeUInt16LE(channels * bits / 8, 32);
    header.writeUInt16LE(bits, 34);
    header.write("data", 36);
    header.writeUInt32LE(dataSize, 40);
    return Buffer.concat([header, pcm]).toString("base64");
};

let geminiClient = null;
const getGemini = () => {
    const key = process.env.GEMINI_CALL_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) return null;
    if (!geminiClient) {
        geminiClient = new GoogleGenAI({ apiKey: key });
    }
    return geminiClient;
};

const transcribeGemini = async (pcmChunks) => {
    const ai = getGemini();
    if (!ai) return "";

    const wavBase64 = buildWavBase64(pcmChunks);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: "Transcribe this phone-call audio exactly as spoken. Output ONLY the spoken words with no extra notes." },
                        { inlineData: { mimeType: "audio/wav", data: wavBase64 } }
                    ]
                }
            ]
        });
        const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log("Transcription:", text);
        return text.trim();
    } catch (err) {
        console.error("Gemini transcription error:", err.message);
        return "";
    }
};

// ==========================================
// Parse webhook body -> name the important bits
// ==========================================

const parseWebhook = (body) => {
    // v2: { data: { event_type, payload: {...} } }   /   v1: { payload: { event_type, ... , call_control_id } }
    const data = (body && body.data) || body || {};
    const rootPayload = (body && body.payload) || {};

    const eventType = data.event_type || rootPayload.event_type || "";
    const payload = data.payload || rootPayload;
    const callControlId = payload.call_control_id || "";
    const callSessionId = payload.call_session_id || "";
    const callLegId = payload.call_leg_id || "";
    const to = payload.to || "";
    const from = payload.from || "";

    let customHeaders = {};
    if (Array.isArray(payload.custom_headers)) {
        payload.custom_headers.forEach((h) => {
            if (h && h.name) customHeaders[h.name] = h.value;
        });
    }

    return { eventType, callControlId, callSessionId, callLegId, to, from, customHeaders };
};

module.exports = {
    API_BASE,
    getApiKey,
    getConnectionId,
    getBaseUrl,
    hasTelnyx,
    api,
    makeOutboundCall,
    sendSpeak,
    sendHangup,
    sendMediaStreamStart,
    sendMediaStreamStop,
    buildWavBase64,
    transcribeGemini,
    parseWebhook
};