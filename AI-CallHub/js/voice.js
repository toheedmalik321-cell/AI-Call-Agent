// ===============================
// Authentication
// ===============================

const token = localStorage.getItem("token");

if (!token) {
    toast("Please Login First");
    window.location = "/login";
}

// ===============================
// Elements
// ===============================

const startBtn = document.getElementById("startBtn");
const status = document.getElementById("status");

// ===============================
// Speech Recognition
// ===============================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    toast("Speech Recognition is not supported in this browser.");
}

const recognition = new SpeechRecognition();

recognition.lang = "en-US";
recognition.interimResults = false;
recognition.continuous = true;

let listening = false;
let aiSpeaking = false;

// ===============================
// Load Voices
// ===============================

let voices = [];

speechSynthesis.onvoiceschanged = () => {
    voices = speechSynthesis.getVoices();
};

// ===============================
// Start Listening
// ===============================

startBtn.onclick = () => {

    if (listening) return;

    listening = true;

    recognition.start();

};

// ===============================
// Recognition Started
// ===============================

recognition.onstart = () => {

    status.innerText = "🎤 Listening...";

};

// ===============================
// User Spoke
// ===============================

recognition.onresult = async (event) => {

    const text =
        event.results[event.results.length - 1][0].transcript;

    console.log("User:", text);

    status.innerText = "🤖 AI Thinking...";

    try {

        const res = await fetch("/ai/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },

            body: JSON.stringify({
                message: text,
                role: "receptionist"
            })

        });

        const data = await res.json();

        const aiReply = data.reply;

        status.innerText = "🗣 AI Speaking...";

        recognition.stop();

        aiSpeaking = true;

        const speech = new SpeechSynthesisUtterance(aiReply);

        speech.lang = "en-US";
        speech.rate = 1;
        speech.pitch = 1;

        const femaleVoice =
            voices.find(v => v.name.toLowerCase().includes("female")) ||
            voices.find(v => v.lang.startsWith("en"));

        if (femaleVoice) {
            speech.voice = femaleVoice;
        }

        speech.onend = () => {

            aiSpeaking = false;

            status.innerText = "🎤 Listening...";

            try {
                recognition.start();
            } catch (err) {
                console.log(err);
            }

        };

        speechSynthesis.speak(speech);

    }

    catch (err) {

        console.log(err);

        status.innerText = "❌ AI Error";

    }

};

// ===============================
// Recognition Ends
// ===============================

recognition.onend = () => {

    listening = false;

    if (!aiSpeaking) {

        setTimeout(() => {

            try {

                listening = true;
                recognition.start();

            } catch (err) {

                console.log(err);

            }

        }, 500);

    }

};

// ===============================
// Recognition Error
// ===============================

recognition.onerror = (event) => {

    console.log(event.error);

    if (event.error === "not-allowed") {

        status.innerText = "❌ Microphone Permission Denied";
        return;

    }

    if (event.error === "no-speech") {

        status.innerText = "🎤 Waiting...";

        try {
            recognition.start();
        } catch (err) {
            console.log(err);
        }

        return;

    }

    status.innerText = "Recognition Error";

};