    // ===============================
// Check Login
// ===============================

const token = localStorage.getItem("token");

if (!token) {
    showToast("Please Login First", "warning");

    setTimeout(() => {
        window.location = "/login";
    }, 1000);
        throw new Error("User not logged in");
}

// ===============================
// Load User Profile
// ===============================

fetch("/api/profile", {
    headers: {
        Authorization: "Bearer " + token
    }
})
.then(res => res.json())
.then(data => {

    if (data.success) {
        document.getElementById("welcome").innerHTML = `
Welcome Back 👋
<span class="text-blue-400">${data.data.name}</span>
`;
    }

})
.catch(err => {
    console.log(err);
});

// ===============================
// Fetch Dashboard Data
// ===============================

fetch("/api/dashboard", {

    method: "GET",

    headers: {
        Authorization: "Bearer " + token
    }

})

.then(res => res.json())

.then(data => {

   if (!data.success) {

    showToast(data.message, "error");
    return;

}

    
   // ===========================
// Dashboard Counts
// ===========================

document.getElementById("users").innerText = data.data.totalUsers;
document.getElementById("calls").innerText = data.data.totalCalls;
document.getElementById("chats").innerText = data.data.totalChats;
document.getElementById("agents").innerText = data.data.totalAgents;
document.getElementById("knowledge").innerText = data.data.totalKnowledge;

document.getElementById("todayCalls").innerText = data.data.todayCalls;
document.getElementById("todayChats").innerText = data.data.todayChats;

const avg = Number(data.data.averageDuration || 0);

document.getElementById("averageDuration").innerText =
    avg < 60 ? avg + " sec" : Math.floor(avg / 60) + " min";

// ===========================
// Weekly Calls Chart
// ===========================

const weekData = data.data.weekData || [];

if (window.Chart && weekData.length > 0) {

    const weeklyCtx = document.getElementById("weeklyChart");

    if (weeklyCtx) {

        new Chart(weeklyCtx, {
            type: "line",
            data: {
                labels: weekData.map(d => d.label),
                datasets: [{
                    label: "Calls",
                    data: weekData.map(d => d.count),
                    borderColor: "#60a5fa",
                    backgroundColor: "rgba(96,165,250,.18)",
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: "#60a5fa",
                    pointBorderColor: "#0b1220",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#0b1220",
                        borderColor: "rgba(255,255,255,.12)",
                        borderWidth: 1,
                        titleColor: "#94a3b8",
                        bodyColor: "#fff"
                    }
                },
                scales: {
                    x: {
                        ticks: { color: "#64748b" },
                        grid: { color: "rgba(148,163,184,.08)" }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: "#64748b",
                            precision: 0,
                            stepSize: 1
                        },
                        grid: { color: "rgba(148,163,184,.08)" }
                    }
                }
            }
        });

    }

}

// ===========================
// Call Status Donut Chart
// ===========================

const statusData = data.data.statusData || [];

if (window.Chart) {

    const statusCtx = document.getElementById("statusChart");

    if (statusCtx) {

        const colorMap = {
            completed: "#22c55e",
            calling: "#f59e0b",
            pending: "#3b82f6",
            failed: "#ef4444"
        };

        const labels = statusData.map(s => s.status) || ["No Calls"];
        const counts = statusData.length
            ? statusData.map(s => s.count)
            : [1];

        const colors = statusData.length
            ? labels.map(l => colorMap[l] || "#64748b")
            : ["#334155"];

        new Chart(statusCtx, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: colors,
                    borderColor: "#0b1220",
                    borderWidth: 3,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#0b1220",
                        borderColor: "rgba(255,255,255,.12)",
                        borderWidth: 1,
                        titleColor: "#94a3b8",
                        bodyColor: "#fff"
                    }
                }
            }
        });

        const legend = document.getElementById("statusLegend");

        if (legend) {

            legend.innerText = statusData.length
                ? statusData.map(s => `${s.status} (${s.count})`).join("  •  ")
                : "No call data yet — make your first call!";

        }

    }

}


// ===========================
// Recent Calls
// ===========================

const calls = document.getElementById("recentCalls");

calls.innerHTML = "";

if (data.data.recentCalls.length === 0) {

    calls.innerHTML = `
        <p class="text-slate-500 text-sm">
            No Calls Yet
        </p>
    `;

} else {

    data.data.recentCalls.forEach(call => {

        calls.innerHTML += `

<div class="glass rounded-xl p-4 hover:border-blue-500/30 transition">

    <div class="flex justify-between items-start">

        <div>

            <h3 class="font-semibold text-white">
                ${call.customerName}
            </h3>

            <p class="text-xs text-slate-400 mt-1">
                ${call.phoneNumber || ""}
            </p>

        </div>

        <span class="text-xs px-2 py-1 rounded-full
        ${
            call.status === "completed"
                ? "bg-green-500/20 text-green-400"
                : call.status === "calling"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-red-500/20 text-red-400"
        }">
            ${call.status}
        </span>

    </div>

    <div class="flex justify-between mt-3 text-xs text-slate-400">

        <span>${call.duration || 0}s</span>

        <span>${new Date(call.createdAt).toLocaleDateString()}</span>

    </div>

</div>

`;

    });

}


// ===========================
// Recent Chats
// ===========================

const chats = document.getElementById("recentChats");

chats.innerHTML = "";

if (data.data.recentChats.length === 0) {

    chats.innerHTML = `
        <p class="text-slate-500 text-sm">
            No Chats
        </p>
    `;

} else {

    data.data.recentChats.forEach(chat => {

        chats.innerHTML += `

<div class="glass rounded-xl p-4 hover:border-blue-500/30 transition">

    <div class="font-semibold line-clamp-2">
        ${chat.message}
    </div>

    <div class="text-xs text-slate-400 mt-3 flex justify-between">

        <span>
            ${new Date(chat.createdAt).toLocaleDateString()}
        </span>

        <span class="text-blue-400">
            AI Chat
        </span>

    </div>

</div>

`;

    });

}
    // ===========================
// Recent Agents
// ===========================

const agents = document.getElementById("recentAgents");

agents.innerHTML = "";

if (data.data.recentAgents.length === 0) {

    agents.innerHTML = `
        <p class="text-slate-500 text-sm">
            No Agents
        </p>
    `;

} else {

    data.data.recentAgents.forEach(agent => {

        agents.innerHTML += `

<div class="glass rounded-xl p-4 hover:border-blue-500/30 transition">

    <div class="flex justify-between items-center">

        <div>

            <h3 class="font-semibold text-white">
                ${agent.companyName}
            </h3>

            <p class="text-xs text-slate-400 mt-1">
                ${agent.role}
            </p>

        </div>

        <span class="text-lg">
            ${agent.isActive ? "🟢" : "⚪"}
        </span>

    </div>

</div>

`;

    });

}

// ===========================
// Recent Knowledge
// ===========================

const knowledge = document.getElementById("recentKnowledge");

knowledge.innerHTML = "";

if (data.data.recentKnowledge.length === 0) {

    knowledge.innerHTML = `
        <p class="text-slate-500 text-sm">
            No Knowledge
        </p>
    `;

} else {

    data.data.recentKnowledge.forEach(file => {

        knowledge.innerHTML += `

<div class="glass rounded-xl p-4 hover:border-blue-500/30 transition">

    <h3 class="font-semibold text-white">
        ${file.title}
    </h3>

    <p class="text-xs text-slate-400 mt-2">
        ${new Date(file.createdAt).toLocaleDateString()}
    </p>

</div>

`;

    });

}

})

.catch(err => {

    console.log(err);

});

// ===============================
// Start AI Call
// ===============================

const startCallBtn = document.getElementById("startCall");

if (startCallBtn) {

    startCallBtn.addEventListener("click", async () => {

        window.location.href = "/agora-call";

    });

}
// ===============================
// Toast Notification
// ===============================
function showToast(message, type = "success") {

    let toast = document.getElementById("toast");

    if (!toast) {

        toast = document.createElement("div");

        toast.id = "toast";

        document.body.appendChild(toast);

    }

    toast.innerText = message;

    toast.className =
        "fixed top-6 right-6 px-5 py-3 rounded-xl text-white font-medium shadow-xl z-50 transition-all duration-300";

    if (type === "success") {
        toast.classList.add("bg-green-600");
    }

    if (type === "error") {
        toast.classList.add("bg-red-600");
    }

    if (type === "warning") {
        toast.classList.add("bg-yellow-500");
    }

    toast.classList.remove("hidden");

    setTimeout(() => {

        toast.classList.add("hidden");

    }, 3000);

}
// ===============================
// Logout
// ===============================

document.getElementById("logoutBtn").addEventListener("click", () => {

    localStorage.removeItem("token");

    window.location = "/login";

});