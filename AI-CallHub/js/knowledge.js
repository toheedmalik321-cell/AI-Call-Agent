const token = localStorage.getItem("token");

// Agar login nahi hai
if (!token) {
    window.location = "/login";
}

// Knowledge list
const knowledgeList = document.getElementById("knowledgeList");

// ==============================
// Load Knowledge
// ==============================

async function loadKnowledge() {

    try {

        // Loading message
        knowledgeList.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-4xl mb-3">📚</div>
                <p class="text-slate-400">
                    Loading knowledge...
                </p>
            </div>
        `;

        const response = await fetch("/api/knowledge", {

            method: "GET",

            headers: {
                Authorization: "Bearer " + token
            }

        });

        const result = await response.json();

        console.log("Knowledge API:", result);

        // Agar API error de
        if (!result.success) {

            knowledgeList.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <p class="text-red-400">
                        ${result.message || "Unable to load knowledge"}
                    </p>
                </div>
            `;

            return;
        }

        const files = result.data;

        // Agar koi file nahi hai
        if (!files || files.length === 0) {

            knowledgeList.innerHTML = `
                <div class="col-span-full text-center py-16">

                    <div class="text-6xl mb-4">
                        📚
                    </div>

                    <h2 class="text-xl font-semibold text-white">
                        No Knowledge Uploaded
                    </h2>

                    <p class="text-slate-400 mt-2 mb-6">
                        Upload your first PDF to give your AI agent knowledge.
                    </p>

                    <a
                        href="/add-knowledge"
                        class="inline-flex
                               items-center
                               gap-2
                               bg-blue-600
                               hover:bg-blue-500
                               px-5
                               py-3
                               rounded-xl
                               font-semibold
                               transition">

                        📤 Upload Knowledge

                    </a>

                </div>
            `;

            return;
        }

        // Clear list
        knowledgeList.innerHTML = "";

        // Create cards
        files.forEach(file => {

            const card = document.createElement("div");

            card.className = `
                knowledge-wrapper
                glass
                rounded-2xl
                p-6
                border
                border-white/10
            `;

            card.innerHTML = `

                <div class="flex items-start justify-between gap-4">

                    <div class="flex items-center gap-4">

                        <div class="
                            w-12
                            h-12
                            rounded-xl
                            bg-red-500/10
                            border
                            border-red-500/20
                            flex
                            items-center
                            justify-center
                            text-2xl
                        ">
                            📄
                        </div>

                        <div>

                            <h3 class="font-bold text-lg text-white">
                                ${escapeHtml(file.title)}
                            </h3>

                            <p class="text-xs text-slate-500 mt-1">
                                ${escapeHtml(file.fileName)}
                            </p>

                        </div>

                    </div>

                    ${
                        file.isActive
                        ? `
                            <span class="
                                px-3
                                py-1
                                rounded-full
                                text-xs
                                font-semibold
                                bg-green-500/10
                                text-green-400
                                border
                                border-green-500/20
                            ">
                                Active
                            </span>
                        `
                        : `
                            <span class="
                                px-3
                                py-1
                                rounded-full
                                text-xs
                                font-semibold
                                bg-slate-500/10
                                text-slate-400
                                border
                                border-white/10
                            ">
                                Inactive
                            </span>
                        `
                    }

                </div>


                <div class="mt-5 text-sm text-slate-400">

                    <p>
                        📅 Uploaded:
                        ${new Date(file.createdAt).toLocaleDateString()}
                    </p>

                </div>


                <div class="
                    flex
                    flex-wrap
                    gap-3
                    mt-6
                ">

                    <a
                        href="/view-knowledge?id=${file._id}"
                        class="
                            flex-1
                            text-center
                            bg-blue-600/10
                            hover:bg-blue-600/20
                            text-blue-400
                            border
                            border-blue-500/20
                            px-4
                            py-2.5
                            rounded-xl
                            font-medium
                            transition
                        ">
                        👁 View
                    </a>


                    ${
                        !file.isActive
                        ? `
                            <button
                                onclick="activateKnowledge('${file._id}')"
                                class="
                                    flex-1
                                    bg-green-600/10
                                    hover:bg-green-600/20
                                    text-green-400
                                    border
                                    border-green-500/20
                                    px-4
                                    py-2.5
                                    rounded-xl
                                    font-medium
                                    transition
                                ">
                                ✓ Activate
                            </button>
                        `
                        : ""
                    }


                    <button
                        onclick="deleteKnowledge('${file._id}')"
                        class="
                            px-4
                            py-2.5
                            rounded-xl
                            bg-red-600/10
                            hover:bg-red-600/20
                            text-red-400
                            border
                            border-red-500/20
                            font-medium
                            transition
                        ">
                        🗑
                    </button>

                </div>

            `;

            knowledgeList.appendChild(card);

        });

    } catch (error) {

        console.error("Knowledge Error:", error);

        knowledgeList.innerHTML = `
            <div class="col-span-full text-center py-12">

                <div class="text-4xl mb-3">
                    ⚠️
                </div>

                <p class="text-red-400">
                    Error loading knowledge.
                </p>

                <p class="text-slate-500 text-sm mt-2">
                    Please try again.
                </p>

            </div>
        `;

    }

}


// ==============================
// Activate Knowledge
// ==============================

async function activateKnowledge(id) {

    try {

        const response = await fetch(
            `/api/knowledge/${id}/active`,
            {
                method: "PUT",

                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        const result = await response.json();

        toast(result.message);

        if (result.success) {
            loadKnowledge();
        }

    } catch (error) {

        console.error(error);

        toast("Unable to activate knowledge.");

    }

}


// ==============================
// Delete Knowledge
// ==============================

async function deleteKnowledge(id) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this knowledge?"
    );

    if (!confirmDelete) {
        return;
    }

    try {

        const response = await fetch(
            `/api/knowledge/${id}`,
            {
                method: "DELETE",

                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        const result = await response.json();

        toast(result.message);

        if (result.success) {
            loadKnowledge();
        }

    } catch (error) {

        console.error(error);

        toast("Unable to delete knowledge.");

    }

}


// ==============================
// Security Helper
// ==============================

function escapeHtml(text) {

    if (!text) {
        return "";
    }

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ==============================
// Start
// ==============================

loadKnowledge();