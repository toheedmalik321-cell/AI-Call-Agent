// ===============================
// Authentication
// ===============================

const TOKEN = localStorage.getItem("token");

if (!TOKEN) {
    toast("Please Login First");
    window.location = "/login";
}

// ===============================
// Elements
// ===============================

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const agentName = document.getElementById("agentName");
const agentRole = document.getElementById("agentRole");
const customerNameInput = document.getElementById("customerName");
const phoneNumberInput = document.getElementById("phoneNumber");
const channelStatus = document.getElementById("channelStatus");
const startCallBtn = document.getElementById("startCallBtn");
const endCallBtn = document.getElementById("endCallBtn");
const transcriptBox = document.getElementById("transcript");
const emptyTranscript = document.getElementById("emptyTranscript");
const clearTransBtn = document.getElementById("clearTransBtn");
const infoBox = document.getElementById("infoBox");

// ===============================
// State
// ===============================

let rtcClient = null;
let localAudioTrack = null;
let remoteAudioTracks = new Map();
let callId = null;
let connected = false;
let listening = false;
let aiSpeaking = false;
let conversationStarted = false;
let channelName = null;

// ===============================
// UI Helpers
// ===============================

function setStatus(label, state) {
    statusText.innerText = label;
    statusDot.className = "status-dot" + (state ? " " + state : "");
}

function addMessage(role, text) {
    emptyTranscript.style.display = "none";

    const isUser = role === "user";
    const div = document.createElement("div");
    div.className = "msg-" + (isUser ? "out" : "in") + " flex " + (isUser ? "justify-end" : "justify-start");

    const bubble = document.createElement("div");
    bubble.className = "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " +
        (isUser
            ? "bg-blue-600/80 text-white rounded-br-sm"
            : "bg-white/8 border border-white/10 text-slate-200 rounded-bl-sm");

    bubble.textContent = text;

    const meta = document.createElement("div");
    meta.className = "text-[11px] text-slate-500 mt-1";
    const time = new Date();
    meta.textContent = (isUser ? "You" : "AI Agent") + " · " + time.toLocaleTimeString();

    const col = document.createElement("div");
    col.className = "flex flex-col " + (isUser ? "items-end" : "items-start");
    col.appendChild(bubble);
    col.appendChild(meta);

    div.appendChild(col);
    transcriptBox.appendChild(div);
    transcriptBox.scrollTop = transcriptBox.scrollHeight;
}

function showTyping() {
    emptyTranscript.style.display = "none";

    const div = document.createElement("div");
    div.className = "flex justify-start msg-in";
    div.id = "typingRow";
    const bubble = document.createElement("div");
    bubble.className = "bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5";
    bubble.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    div.appendChild(bubble);
    transcriptBox.appendChild(div);
    transcriptBox.scrollTop = transcriptBox.scrollHeight;
}

function hideTyping() {
    const row = document.getElementById("typingRow");
    if (row) row.remove();
}

// ===============================
// Speech recognition + TTS
// ===============================

let recognition = null;
let voices = [];

if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = true;
} else {
    alert("Speech recognition not supported in this browser. Use Chrome.");
}

speechSynthesis.onvoiceschanged = () => {
    voices = speechSynthesis.getVoices();
};

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function speak(text) {
    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(fallback);
            resolve();
        };

        try { speechSynthesis.pause(); speechSynthesis.cancel(); speechSynthesis.resume(); } catch (e) {}

        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "en-US";
        utter.rate = 1;
        utter.pitch = 1;

        const femaleVoice =
            voices.find(v => /female|zira|samantha|karen|moira|tessa/i.test(v.name)) ||
            voices.find(v => v.lang.startsWith("en"));

        if (femaleVoice) utter.voice = femaleVoice;

        utter.onend = finish;
        utter.onerror = finish;

        // Chrome sometimes never fires onend (known bug). Fallback covers it.
        const fallback = setTimeout(finish, Math.max(3000, text.length * 70));

        setTimeout(() => {
            try { speechSynthesis.speak(utter); } catch (e) { finish(); }
        }, 30);
    });
}

// ===============================
// Agora RTC
// ===============================

async function joinAgoraChannel(appId, token, channel, uid) {
    rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    // Handle remote users (echo of your own stream is ignored in single-participant demo)
    rtcClient.on("user-published", async (user, mediaType) => {
        await rtcClient.subscribe(user, mediaType);
        if (mediaType === "audio") {
            const audioTrack = user.audioTrack;
            remoteAudioTracks.set(user.uid, audioTrack);
            audioTrack.play();
        }
    });

    rtcClient.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "audio") {
            const t = remoteAudioTracks.get(user.uid);
            if (t) { t.stop(); t.close(); remoteAudioTracks.delete(user.uid); }
        }
    });

    rtcClient.on("user-left", (user) => {
        const t = remoteAudioTracks.get(user.uid);
        if (t) { t.stop(); t.close(); remoteAudioTracks.delete(user.uid); }
    });

    rtcClient.on("connection-state-change", (cur, prev) => {
        if (cur === "CONNECTED") {
            channelStatus.innerText = "Agora channel connected: " + channel;
            channelStatus.className = "text-sm text-green-400";
        }
    });

    await rtcClient.join(appId, channel, token, uid || null);

    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    await rtcClient.publish([localAudioTrack]);
}

async function leaveAgoraChannel() {
    if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
        localAudioTrack = null;
    }
    remoteAudioTracks.forEach(t => { try { t.stop(); t.close(); } catch (e) {} });
    remoteAudioTracks.clear();
    if (rtcClient) {
        try { await rtcClient.leave(); } catch (e) {}
        rtcClient = null;
    }
    channelStatus.innerText = "Agora channel not connected";
    channelStatus.className = "text-sm text-slate-400";
}

// ===============================
// Start Call
// ===============================

startCallBtn.onclick = async () => {

    if (connected) return;
    startCallBtn.disabled = true;

    try {

        // 1. Get Agora config (appId + channel)
        setStatus("Connecting...", "ringing");

        const cfgRes = await fetch("/api/agora/config", {
            headers: { Authorization: "Bearer " + TOKEN }
        });
        const cfg = await cfgRes.json();

        if (!cfg.success) {
            toast(cfg.message || "Agora not configured", "error");
            setStatus("Idle", "");
            startCallBtn.disabled = false;
            return;
        }

        const appId = cfg.data.appId;
        channelName = cfg.data.channelName;

        // 2. Get RTC token
        const tokRes = await fetch("/api/agora/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + TOKEN
            },
            body: JSON.stringify({ channelName, uid: 0 })
        });
        const tok = await tokRes.json();

        if (!tok.success) {
            toast(tok.message || "Token error", "error");
            setStatus("Idle", "");
            startCallBtn.disabled = false;
            return;
        }

        // 3. Start the call (create Call record + AI greeting)
        const startRes = await fetch("/api/agora/call/start", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + TOKEN
            },
            body: JSON.stringify({
                customerName: customerNameInput.value.trim(),
                phoneNumber: phoneNumberInput.value.trim(),
                channelName,
                role: "receptionist"
            })
        });
        const startData = await startRes.json();

        if (!startData.success) {
            toast(startData.message || "Failed to start call", "error");
            setStatus("Idle", "");
            startCallBtn.disabled = false;
            return;
        }

        callId = startData.callId;
        agentName.innerText = startData.agent.name || "AI Agent";
        agentRole.innerText = startData.agent.role || "Receptionist";

        // 4. Join Agora channel (real-time audio)
        await joinAgoraChannel(appId, tok.data.token, channelName, 0);

        setStatus("In Call", "live");
        connected = true;
        endCallBtn.disabled = false;
        startCallBtn.innerText = "📞 In Call";

        // 5. Speak the greeting + start listening
        stopTts();
        addMessage("user", "—");
        addMessage("ai", startData.greeting);
        conversationStarted = true;

        // speak() has a fallback promise — listening starts after it resolves
        aiSpeaking = true;
        setStatus("AI Speaking...", "live");
        speak(startData.greeting).then(() => {
            if (aiSpeaking) aiSpeaking = false;
            if (connected) {
                setStatus("Listening...", "live");
                startListening();
            }
        });

    } catch (err) {
        console.error("start call error:", err);
        toast("Failed to connect call: " + err.message, "error");
        stopTts();
        await leaveAgoraChannel();
        setStatus("Failed", "");
        connected = false;
        endCallBtn.disabled = true;
        startCallBtn.innerText = "📞 Start AI Voice Call";
    } finally {
        startCallBtn.disabled = false;
    }

};

// ===============================
// Speech handling loop
// ===============================

function startListening() {
    if (!recognition || aiSpeaking || !connected) return;
    if (listening) return;

    try {
        recognition.start();
        listening = true;
        setStatus("Listening...", "live");
    } catch (e) {
        console.log("recognition.start:", e);
        listening = false;
        setTimeout(() => { if (connected && !aiSpeaking) startListening(); }, 500);
    }
}

if (recognition) {
    recognition.onstart = () => {
        listening = true;
        setStatus("Listening...", "live");
    };

    recognition.onresult = async (event) => {
        if (aiSpeaking) return;

        const text = event.results[event.results.length - 1][0].transcript.trim();
        if (!text || !connected) return;

        console.log("User said:", text);

        // Stop listening while AI replies
        try { recognition.stop(); } catch (e) {}
        listening = false;

        addMessage("user", text);
        setStatus("AI Thinking...", "live");
        showTyping();

        try {
            const res = await fetch("/api/agora/call/turn", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + TOKEN
                },
                body: JSON.stringify({ callId, speech: text })
            });

            const data = await res.json();

            hideTyping();

            if (!data.success) {
                toast(data.message || "AI error", "error");
                setStatus("In Call", "live");
                startListening();
                return;
            }

            addMessage("ai", data.reply);

            if (data.endCall) {
                setStatus("Call Ended", "");
                connected = false;
                endCallBtn.disabled = true;
                startCallBtn.disabled = true;
                startCallBtn.innerText = "📞 Call Ended";
                leaveAgoraChannel();
                toast("Call completed. Summary generated! 🎉");
                setStatus("Completed", "");
                return;
            }

            // Speak AI reply, then listen again
            aiSpeaking = true;
            setStatus("AI Speaking...", "live");
            await speak(data.reply);
            aiSpeaking = false;

            if (connected) {
                setStatus("Listening...", "live");
                startListening();
            }

        } catch (err) {
            console.error("turn error:", err);
            aiSpeaking = false;
            hideTyping();
            toast("Error getting AI reply", "error");
            setStatus("In Call", "live");
            startListening();
        }
    };

    recognition.onend = () => {
        listening = false;
        if (connected && !aiSpeaking) {
            setTimeout(() => startListening(), 600);
        }
    };

    recognition.onerror = (event) => {
        console.log("recognition error:", event.error);

        if (event.error === "not-allowed") {
            setStatus("Mic permission denied", "");
            listening = false;
            return;
        }

        // no-speech / aborted / network — restart cleanly
        listening = false;
        if (connected && !aiSpeaking) {
            setTimeout(() => startListening(), 800);
        }
    };
}

// ===============================
// End Call
// ===============================

endCallBtn.onclick = async () => {
    if (!connected && !callId) return;

    endCallBtn.disabled = true;
    stopTts();
    if (recognition) { try { recognition.stop(); } catch (e) {} listening = false; }

    try {
        if (callId) {
            await fetch("/api/agora/call/end", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + TOKEN
                },
                body: JSON.stringify({ callId })
            });
        }
    } catch (e) { console.log(e); }

    await leaveAgoraChannel();
    connected = false;
    callId = null;

    setStatus("Ended", "");
    startCallBtn.disabled = false;
    startCallBtn.innerText = "📞 Start AI Voice Call";
    toast("Call ended", "error");
};

// ===============================
// Clear transcript
// ===============================

clearTransBtn.onclick = () => {
    transcriptBox.querySelectorAll("div.flex").forEach(el => el.remove());
    emptyTranscript.style.display = "";
};

document.addEventListener("beforeunload", () => {
    if (connected) {
        leaveAgoraChannel();
        if (callId) {
            const blob = new Blob([JSON.stringify({ callId })], { type: "application/json" });
            navigator.sendBeacon("/api/agora/call/end", blob);
        }
    }
});