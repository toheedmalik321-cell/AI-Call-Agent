// ==============================
// Check Login
// ==============================

const token = localStorage.getItem("token");

if (!token) {
    window.location = "/login";
}

// ==============================
// Get Call ID
// ==============================

const params = new URLSearchParams(window.location.search);

const callId = params.get("id");

// ==============================
// Load Call Details
// ==============================

async function loadCall() {

    try {

        const res = await fetch("/api/calls/" + callId,{

            headers: {

                Authorization: "Bearer " + token

            }

        });

        const data = await res.json();

        if (!data.success) {

            toast(data.message);

            return;

        }

        const call = data.data;

        document.getElementById("customerName").innerText =
            call.customerName || "Unknown";

        document.getElementById("phoneNumber").innerText =
            call.phoneNumber || "-";

        document.getElementById("agentName").innerText =
            call.agent?.companyName || "-";

        document.getElementById("agentRole").innerText =
            call.agent?.role || "-";

        document.getElementById("status").innerText =
            call.status || "-";

        document.getElementById("duration").innerText =
            (call.duration || 0) + " sec";

        document.getElementById("customerMessage").innerText =
            call.customerMessage || "No message";

        document.getElementById("aiReply").innerText =
            call.aiReply || "No AI Reply";

        document.getElementById("summary").innerText =
            call.callSummary || "No Summary";

        // ===========================
        // Call Recording Player
        // ===========================

        const recordingBox = document.getElementById("recordingBox");

        if (call.recordingUrl) {

            recordingBox.innerHTML = `
                <audio controls class="w-full"
                       src="/api/calls/${call._id}/recording?token=${encodeURIComponent(token)}">
                    Your browser does not support the audio element.
                </audio>
                <p class="text-xs text-slate-500 mt-2">
                    Play the full call recording
                </p>
            `;

        } else {

            recordingBox.innerHTML = `
                <p class="text-slate-500 text-sm">
                    No recording available for this call.
                </p>
            `;

        }

        document.getElementById("transcript").innerText =
            call.transcript || "No Transcript";

    }

    catch (err) {

        console.log(err);

        toast("Unable to load call details.");

    }

}

// ==============================
// Start
// ==============================

loadCall();