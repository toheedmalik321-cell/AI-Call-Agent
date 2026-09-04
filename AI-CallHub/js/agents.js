const token = localStorage.getItem("token");

if (!token) {
    window.location = "/login";
}

loadAgents();

// ===============================
// Load Agents
// ===============================

async function loadAgents() {

    try {

        const res = await fetch("/agent", {
            headers: {
                Authorization: "Bearer " + token
            }
        });

        const data = await res.json();

        const container = document.getElementById("agentsList");

        container.innerHTML = "";

        if (!data.success) {
            container.innerHTML = `
                <div class="glass rounded-2xl p-8 text-center">
                    <p class="text-red-400">Unable to load agents.</p>
                </div>
            `;
            return;
        }

        // Stats
        const total = data.data.length;
        const active = data.data.filter(a => a.isActive).length;
        const inactive = total - active;

        document.getElementById("totalAgents").innerText = total;
        document.getElementById("activeAgents").innerText = active;
        document.getElementById("inactiveAgents").innerText = inactive;

        // Agar API me todayCalls nahi hai to 0 hi rahega
        document.getElementById("todayCalls").innerText = 0;

        // Search
        const search = document.getElementById("searchAgent").value.toLowerCase();

        const filtered = data.data.filter(agent =>
    (agent.companyName || "").toLowerCase().includes(search) ||
    (agent.role || "").toLowerCase().includes(search)
);
        if (filtered.length === 0) {

            container.innerHTML = `
                <div class="glass rounded-2xl p-10 text-center col-span-full">
                    <h2 class="text-xl font-semibold text-slate-300">
                        No Agent Found
                    </h2>
                </div>
            `;

            return;
        }

        filtered.forEach(agent => {

            container.innerHTML += `

<div class="glass rounded-2xl p-6 hover:border-blue-500/30 hover:scale-[1.02] transition-all duration-300">

    <div class="flex justify-between items-start mb-4">

        <div>

            <h2 class="text-2xl font-bold">
                ${agent.companyName}
            </h2>

            <p class="text-slate-400 text-sm mt-1">
                ${agent.role}
            </p>

        </div>

        <span class="px-3 py-1 rounded-full text-xs font-semibold
        ${agent.isActive
            ? "bg-green-500/20 text-green-400"
            : "bg-red-500/20 text-red-400"}">

            ${agent.isActive ? "🟢 Active" : "🔴 Inactive"}

        </span>

    </div>

    <div class="bg-black/20 rounded-xl p-4 text-slate-300 text-sm leading-6 h-28 overflow-hidden">

        ${agent.instructions}

    </div>

    <div class="flex gap-3 mt-6 flex-wrap">

        <button
            onclick="setActive('${agent._id}')"
            class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl transition">

            ✅ Set Active

        </button>

        <a
            href="/edit-agent?id=${agent._id}"
            class="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-xl transition">

            ✏️ Edit

        </a>

        <button
            onclick="deleteAgent('${agent._id}')"
            class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl transition">

            🗑 Delete

        </button>

    </div>

</div>

`;

        });

    }

    catch (err) {

        console.log(err);

        toast("Failed to load agents.");

    }

}

// Search Live
document.addEventListener("input", function(e){

    if(e.target.id==="searchAgent"){
        loadAgents();
    }

});
// ===============================
// Delete Agent
// ===============================

async function deleteAgent(id) {

    if (!(await confirmDialog("Delete this agent? This cannot be undone."))) return;

    try {

        const res = await fetch("/agent/" + id, {

            method: "DELETE",

            headers: {
                Authorization: "Bearer " + token
            }

        });

        const data = await res.json();

        showToast(data.message, "success");

        loadAgents();

    }

    catch (err) {

        console.log(err);

    }

}

// ===============================
// Set Active Agent
// ===============================

async function setActive(id) {

    try {

        const res = await fetch("/agent/active/" + id, {

            method: "PUT",

            headers: {
                Authorization: "Bearer " + token
            }

        });

        const data = await res.json();

        toast(data.message);

        loadAgents();

    }

    catch (err) {

        console.log(err);

    }

}