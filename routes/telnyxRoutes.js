const express = require("express");
const { WebSocketServer } = require("ws");

const router = express.Router();

const auth = require("../middlewares/auth");
const controller = require("../controllers/telnyxController");
const telnyx = require("../services/telnyxService");

// ==========================================
// Routes
// ==========================================

// Browser UI -> start an outbound Telnyx call
router.post("/telnyx/start-call", auth, controller.startCall);

// Unauthenticated webhook — Telnyx posts call events here
router.post("/telnyx/incoming", controller.webhook);

// ==========================================
// Media-stream WebSocket server
// Telnyx streams customer audio here, we transcribe -> AI -> speak
// ==========================================

const wss = new WebSocketServer({ noServer: true });

const attachWebSocket = (server) => {

    server.on("upgrade", (req, socket, head) => {

        let pathname = "";
        try {
            pathname = new URL(req.url, "http://localhost").pathname;
        } catch (_) {
            socket.destroy();
            return;
        }

        if (pathname === "/telnyx/media-stream") {
            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit("connection", ws, req);
            });
            return;
        }

        socket.destroy();
    });

    wss.on("connection", (ws) => {
        let streamId = null;
        let ctx = null;
        let chunks = [];

        console.log("Telnyx media-stream socket connected");

        ws.on("message", async (raw) => {
            let event = null;
            try {
                event = JSON.parse(raw.toString());
            } catch (_) {
                return;
            }

            const sid = event.stream_id || (event.payload && event.payload.stream_id);
            if (sid) {
                streamId = sid;
                ctx = controller.activeCalls.get(streamId) || null;
            }

            const evt = event.event || "";

            if (evt === "vad.start") {
                chunks = [];
                return;
            }

            if (evt === "media") {
                const payload = event.media && event.media.payload;
                if (payload && ctx) {
                    const buf = Buffer.from(payload, "base64");
                    chunks.push(buf);
                    // Safety cap (~10s of 8kHz 16-bit PCM = 160KB)
                    if (chunks.length > 80) chunks.shift();
                }
                return;
            }

            if (evt === "vad.stop") {
                if (!ctx || chunks.length === 0) {
                    chunks = [];
                    return;
                }
                const pcm = chunks;
                chunks = [];
                const text = await telnyx.transcribeGemini(pcm);
                if (text) {
                    console.log("Customer said (telnyx):", text);
                    await controller.processTurn(text, ctx);
                }
                return;
            }

            if (evt === "stop") {
                chunks = [];
            }
        });

        ws.on("error", () => {});
        ws.on("close", () => {
            chunks = [];
        });
    });
};

module.exports = { router, attachWebSocket };