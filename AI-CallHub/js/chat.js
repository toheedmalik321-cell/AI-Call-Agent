// ==========================================
// AI CallHub Professional Chat
// Part 1
// ==========================================

const token = localStorage.getItem("token");

if (!token) {
    toast("Please login first");
    window.location = "/login";
}

// ==========================================
// Elements
// ==========================================

const chatLog = document.getElementById("chatLog");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

const chatSessions = document.getElementById("chatSessions");
const newChatBtn = document.getElementById("newChatBtn");

const welcomeScreen = document.getElementById("welcomeScreen");
const micBtn = document.getElementById("micBtn");
// ==========================================
// Current Session
// ==========================================

let currentSession = null;

// ==========================================
// Create New Chat
// ==========================================

newChatBtn.addEventListener("click", createNewChat);

async function createNewChat() {

    try {

        const res = await fetch("/api/chat/session", {

            method: "POST",

            headers: {

                Authorization: "Bearer " + token

            }

        });

        const data = await res.json();

        if (!data.success) {

            toast(data.message);
            return;

        }

        currentSession = data.data._id;

        chatLog.innerHTML = "";

        if (welcomeScreen) {

            welcomeScreen.style.display = "flex";

        }

        loadSessions();

    }

    catch (err) {

        console.log(err);

    }

}

// ==========================================
// Load All Sessions
// ==========================================

async function loadSessions() {

    try {

        const res = await fetch("/api/chat/sessions", {

            headers: {

                Authorization: "Bearer " + token

            }

        });

        const data = await res.json();

        chatSessions.innerHTML = "";

        if (!data.success) return;

        data.data.forEach(session => {

            chatSessions.innerHTML += `

<div

class="chat-item rounded-xl p-4 cursor-pointer ${currentSession===session._id?"active":""}"

onclick="openSession('${session._id}')">

<div class="font-semibold truncate">

${session.title}

</div>

<div class="text-xs text-gray-400 mt-1">

${new Date(session.updatedAt).toLocaleDateString()}

</div>

</div>

`;

        });

    }

    catch(err){

        console.log(err);

    }

}
// ==========================================
// Open Session
// ==========================================

async function openSession(sessionId){

    currentSession = sessionId;

    loadSessions();

    loadMessages(sessionId);

}

// ==========================================
// Load Messages
// ==========================================

async function loadMessages(sessionId){

    try{

        const res = await fetch("/api/chat/history/" + sessionId,{

            headers:{
                Authorization:"Bearer " + token
            }

        });

        const data = await res.json();

        chatLog.innerHTML = "";

        if(welcomeScreen){

            welcomeScreen.style.display = "none";

        }

        if(!data.success) return;

        data.data.forEach(chat=>{

            // User Bubble

            chatLog.innerHTML += `

<div class="flex justify-end">

<div class="bg-teal-600 rounded-2xl px-5 py-3 max-w-[70%] shadow-lg">

<p class="text-sm text-gray-200 mb-1">

You

</p>

<p>

${chat.message}

</p>

</div>

</div>

`;

            // AI Bubble

            chatLog.innerHTML += `

<div class="flex">

<div class="bg-[#111827] rounded-2xl px-5 py-3 max-w-[70%] border border-gray-700 shadow-lg">

<p class="text-teal-300 text-sm mb-1">

AI Assistant

</p>

<p>

${chat.reply}

</p>

</div>

</div>

`;

        });

        chatLog.scrollTop = chatLog.scrollHeight;

    }

    catch(err){

        console.log(err);

    }

}
// ==========================================
// Send Message
// ==========================================

chatForm.addEventListener("submit", sendMessage);

async function sendMessage(e){

    e.preventDefault();

    const message = chatInput.value.trim();

    if(!message) return;

    if(!currentSession){

        toast("Please create a new chat first.");

        return;

    }

    if(welcomeScreen){

        welcomeScreen.style.display="none";

    }

    // ===========================
    // User Bubble
    // ===========================

    chatLog.innerHTML += `

<div class="flex justify-end">

<div class="bg-teal-600 rounded-2xl px-5 py-3 max-w-[70%] shadow-lg">

<p class="text-sm text-gray-200 mb-1">

You

</p>

<p>

${message}

</p>

</div>

</div>

`;

    chatInput.value="";

    chatLog.scrollTop=chatLog.scrollHeight;

    // ===========================
    // Typing Animation
    // ===========================

    const typingId="typing-"+Date.now();

chatLog.innerHTML += `

<div id="${typingId}" class="flex">

<div class="bg-[#111827] border border-gray-700 rounded-2xl px-5 py-3 flex items-center gap-2">

<span class="typing-dot"></span>

<span class="typing-dot"></span>

<span class="typing-dot"></span>

</div>

</div>

`;
    chatLog.scrollTop=chatLog.scrollHeight;

    try{

        const res=await fetch("/api/chat",{

            method:"POST",

            headers:{

                "Content-Type":"application/json",

                Authorization:"Bearer "+token

            },

            body:JSON.stringify({

                sessionId:currentSession,

                message,

                role:"receptionist"

            })

        });

        const data=await res.json();

        document.getElementById(typingId)?.remove();

        if(!data.success){

            toast(data.message);

            return;

        }

        // ===========================
        // AI Bubble
        // ===========================

        chatLog.innerHTML += `

<div class="flex">

<div class="bg-[#111827] border border-gray-700 rounded-2xl px-5 py-3 max-w-[70%] shadow-lg">

<p class="text-teal-300 text-sm mb-1">

AI Assistant

</p>

<p>

${data.reply}

</p>

</div>

</div>

`;

        chatLog.scrollTop=chatLog.scrollHeight;

        loadSessions();

    }

    catch(err){

        console.log(err);

        document.getElementById(typingId)?.remove();

        chatLog.innerHTML += `

<div class="flex">

<div class="bg-red-600 rounded-2xl px-5 py-3">

Unable to contact AI server.

</div>

</div>

`;

    }

}
// ==========================================
// Press Enter
// ==========================================

chatInput.addEventListener("keypress", function (e) {

    if (e.key === "Enter" && !e.shiftKey) {

        e.preventDefault();

        chatForm.dispatchEvent(new Event("submit"));

    }

});

// ==========================================
// Initial Load
// ==========================================

async function initChat() {

    await loadSessions();

    try {

        const res = await fetch("/api/chat/sessions", {

            headers: {

                Authorization: "Bearer " + token

            }

        });

        const data = await res.json();

        if (!data.success) return;

        if (data.data.length > 0) {

            currentSession = data.data[0]._id;

            loadSessions();

            openSession(currentSession);

        } else {

            if (welcomeScreen) {

                welcomeScreen.style.display = "flex";

            }

        }

    } catch (err) {

        console.log(err);

    }

}

initChat();

// ==========================================
// Voice Recognition
// ==========================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognition && micBtn) {

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    micBtn.addEventListener("click", () => {

        console.log("Mic button clicked");

        recognition.start();

    });

    recognition.onstart = () => {

        console.log("Recognition Started");

        micBtn.innerHTML = "🎙️";

    };

    recognition.onresult = (event) => {

        console.log("Result:", event);

        chatInput.value = event.results[0][0].transcript;

    };

    recognition.onerror = (event) => {

        console.log("Speech Error:", event.error);

    };

    recognition.onend = () => {

        console.log("Recognition Ended");

        micBtn.innerHTML = "🎤";

    };

}