// ==============================
// Check Login
// ==============================

const token = localStorage.getItem("token");

if (!token) {
    window.location = "/login";
}

// ==============================
// Load Plans + Current Subscription
// ==============================

let paymentMode = "stripe";

async function loadPlans() {

    try {

        const res = await fetch("/api/plans", {

            headers: {
                Authorization: "Bearer " + token
            }

        });

        const data = await res.json();

        if (!data.success) {
            document.getElementById("currentPlanLabel").textContent = data.message || "Error";
            return;
        }

        paymentMode = data.data.mode || "stripe";

        renderPlans(data.data.plans, data.data.current);

    }
    catch (err) {

        console.log(err);
        document.getElementById("currentPlanLabel").textContent = "Error loading plans";

    }

}

// ==============================
// Render Plan Cards
// ==============================

function renderPlans(plans, current) {

    const grid = document.getElementById("plansGrid");
    const label = document.getElementById("currentPlanLabel");
    const dot = document.getElementById("statusDot");

    // Current plan box
    const planNames = { free: "Free", pro: "Pro", enterprise: "Enterprise" };
    const active = ["active", "trialing"].includes(current.status);

    label.textContent = planNames[current.plan] || "Free";

    if (current.status && current.status !== "none") {
        label.textContent += " • " + (current.status[0].toUpperCase() + current.status.slice(1));
    }

    if (current.periodEnd && active) {

        const d = new Date(current.periodEnd);

        label.textContent += " • Renews " + d.toLocaleDateString();

    }

    if (active) {
        dot.className = "w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse";
    } else {
        dot.className = "w-2.5 h-2.5 rounded-full bg-slate-500";
    }

    grid.innerHTML = "";

    plans.forEach(plan => {

        const isCurrent = current.plan === plan.code;
        const isActiveCurrent = isCurrent && active;
        const isFree = plan.code === "free";

        const card = document.createElement("div");
        card.className = "glass rounded-3xl p-6 border border-white/10 flex flex-col";

        card.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <h2 class="text-xl font-bold text-slate-100">${plan.name}</h2>
                ${isActiveCurrent ? '<span class="text-xs font-semibold px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400">CURRENT</span>' : ""}
            </div>

            <p class="text-sm text-slate-400 mb-5">${plan.description}</p>

            <div class="mb-6">
                <span class="plan-price text-4xl font-extrabold text-blue-400">${plan.priceLabel}</span>
                <span class="text-slate-400 text-sm">/ month</span>
            </div>

            <ul class="space-y-2 text-sm text-slate-300 mb-8 flex-1">
                ${plan.features.map(f => `<li>${f}</li>`).join("")}
            </ul>

            <button
                class="plan-cta ${isActiveCurrent ? "plan-current" : (isFree ? "plan-free-cta" : "")}"
                data-code="${plan.code}"
                ${isActiveCurrent ? "disabled" : ""}>
                ${isActiveCurrent ? "Current Plan" : plan.cta}
            </button>
        `;

        grid.appendChild(card);

    });

    grid.querySelectorAll(".plan-cta:not([disabled])").forEach(btn => {

        btn.addEventListener("click", () => subscribe(btn.dataset.code));

    });

}

// ==============================
// Subscribe / Upgrade / Downgrade
// ==============================

async function subscribe(code) {

    const btn = document.querySelector(`.plan-cta[data-code="${code}"]`);
    const original = btn.textContent;

    btn.textContent = "Please wait...";
    btn.disabled = true;

    try {

        const res = await fetch("/api/subscribe", {

            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify({ code })

        });

        const data = await res.json();

        if (data.success && data.data.mock) {

            btn.textContent = original;
            btn.disabled = false;
            openMockModal(data.data);
            return;

        }

        if (data.success && data.data.url) {

            if (data.data.usePortal) {
                const portalRes = await fetch("/api/subscription/portal", {
                    method: "POST",
                    headers: { Authorization: "Bearer " + token }
                });
                const portalData = await portalRes.json();
                if (portalData.success && portalData.data.url) {
                    window.location = portalData.data.url;
                    return;
                }
            }

            window.location = data.data.url;
            return;

        }

        toast(data.message || "Something went wrong");
        btn.textContent = original;
        btn.disabled = false;

    }
    catch (err) {

        console.log(err);
        toast("Error connecting to server");
        btn.textContent = original;
        btn.disabled = false;

    }

}

// ==============================
// Mock Payment Modal
// ==============================

let mockPlanCode = null;

function openMockModal(plan) {

    mockPlanCode = plan.code;

    document.getElementById("mockPlanLabel").textContent = plan.name + " Plan";
    document.getElementById("mockAmountLabel").textContent = plan.priceLabel;
    document.getElementById("mockPayBtn").textContent = "Pay " + plan.priceLabel;
    document.getElementById("mockError").classList.add("hidden");

    document.getElementById("mockModal").classList.remove("hidden");

}

function closeMockModal() {

    mockPlanCode = null;
    document.getElementById("mockModal").classList.add("hidden");

}

async function mockPay() {

    if (!mockPlanCode) return;

    const payBtn = document.getElementById("mockPayBtn");
    const errEl = document.getElementById("mockError");

    const cardNumber = document.getElementById("mockCardNumber").value.replace(/\s+/g, "");
    const expiry = document.getElementById("mockCardExpiry").value.trim();
    const cvc = document.getElementById("mockCardCvc").value.trim();
    const name = document.getElementById("mockCardName").value.trim();

    if (!cardNumber || !expiry || !cvc || !name) {
        errEl.textContent = "Sab fields fill karo (demo ke liye koi bhi number chalta hai).";
        errEl.classList.remove("hidden");
        return;
    }

    if (cardNumber.endsWith("0002")) {
        errEl.textContent = "Payment declined (test decline card). Try 4242 4242 4242 4242.";
        errEl.classList.remove("hidden");
        return;
    }

    payBtn.disabled = true;
    payBtn.textContent = "Processing...";

    try {

        const res = await fetch("/api/subscription/mock-pay", {

            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify({ code: mockPlanCode })

        });

        const data = await res.json();

        if (data.success) {

            closeMockModal();
            showNotice(data.message, "success");
            loadPlans();

        } else {

            errEl.textContent = data.message || "Payment failed";
            errEl.classList.remove("hidden");
            payBtn.disabled = false;
            payBtn.textContent = "Pay";

        }

    }
    catch (err) {

        console.log(err);
        errEl.textContent = "Error connecting to server";
        errEl.classList.remove("hidden");
        payBtn.disabled = false;
        payBtn.textContent = "Pay";

    }

}

document.getElementById("mockPayBtn").addEventListener("click", mockPay);

document.getElementById("mockCloseBtn").addEventListener("click", closeMockModal);

document.getElementById("mockOverlay").addEventListener("click", closeMockModal);

// ==============================
// Card inputs auto-format
// ==============================

// Card number: space har 4 digits ke baad
const cardNumberInput = document.getElementById("mockCardNumber");

if (cardNumberInput) {

    cardNumberInput.addEventListener("input", () => {

        const digits = cardNumberInput.value.replace(/\D/g, "").slice(0, 16);
        cardNumberInput.value = digits.replace(/(.{4})/g, "$1 ").trim();

    });

}

// Expiry: auto MM/YY with slash, cursor agle part pe
const expiryInput = document.getElementById("mockCardExpiry");

if (expiryInput) {

    expiryInput.addEventListener("input", () => {

        let digits = expiryInput.value.replace(/\D/g, "").slice(0, 4);
        let formatted = digits;

        if (digits.length >= 3) {
            formatted = digits.slice(0, 2) + "/" + digits.slice(2);
        } else if (digits.length === 2) {
            formatted = digits + "/";
        }

        expiryInput.value = formatted;

    });

}

// CVC: sirf 3-4 digits
const cvcInput = document.getElementById("mockCardCvc");

if (cvcInput) {

    cvcInput.addEventListener("input", () => {

        cvcInput.value = cvcInput.value.replace(/\D/g, "").slice(0, 4);

    });

}

// ==============================
// Manage (Stripe portal)
// ==============================

document.getElementById("manageBtn").addEventListener("click", async () => {

    if (paymentMode === "mock") {
        toast("Demo mode: subscription cancel ke liye 'Cancel' button use karo.");
        return;
    }

    try {

        const res = await fetch("/api/subscription/portal", {

            method: "POST",
            headers: { Authorization: "Bearer " + token }

        });

        const data = await res.json();

        if (data.success && data.data.url) {
            window.location = data.data.url;
        } else {
            toast(data.message || "No payment account yet");
        }

    }
    catch (err) {

        console.log(err);
        toast("Error connecting to server");

    }

});

// ==============================
// Cancel
// ==============================

document.getElementById("cancelBtn").addEventListener("click", async () => {

    if (!(await confirmDialog("Cancel your subscription? You will be downgraded to Free."))) return;

    try {

        const res = await fetch("/api/subscription/cancel", {

            method: "POST",
            headers: { Authorization: "Bearer " + token }

        });

        const data = await res.json();

        toast(data.message || "Done");
        loadPlans();

    }
    catch (err) {

        console.log(err);
        toast("Error connecting to server");

    }

});

// ==============================
// Show notice banner
// ==============================

function showNotice(message, type) {

    const bar = document.getElementById("noticeBar");

    if (!bar) return;

    bar.classList.remove("hidden");
    bar.className = "mb-6 glass rounded-2xl px-5 py-4 border font-medium " +
        (type === "success"
            ? "border-green-500/30 text-green-400"
            : "border-yellow-500/30 text-yellow-400");

    bar.textContent = message;

}

// ==============================
// On success / cancel return from Stripe
// ==============================

async function handleReturn() {

    const params = new URLSearchParams(window.location.search);

    if (params.get("success")) {

        showNotice("Payment successful! Syncing your subscription...", "success");

        try {

            await fetch("/api/subscription/status", {
                headers: { Authorization: "Bearer " + token }
            });

            showNotice("Subscription Active! 🎉", "success");

        } catch (err) {
            console.log(err);
        }

    } else if (params.get("cancel")) {

        showNotice("Payment was cancelled. Your plan is unchanged.", "warn");

    }

}

// ==============================
loadPlans();

handleReturn().then(loadPlans);