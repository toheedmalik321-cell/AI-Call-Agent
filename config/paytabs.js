require("dotenv").config();
const crypto = require("crypto");

// PayTabs hosts are region-scoped. Pick the host matching your merchant
// profile's region (see your PayTabs dashboard), otherwise auth fails with 401.
const REGION_HOSTS = {
    ARE: "https://secure.paytabs.com",
    SAU: "https://secure.paytabs.sa",
    EGY: "https://secure-egypt.paytabs.com",
    OMN: "https://secure-oman.paytabs.com",
    JOR: "https://secure-jordan.paytabs.com",
    KWT: "https://secure-kuwait.paytabs.com",
    IRQ: "https://secure-iraq.paytabs.com",
    MAR: "https://secure-morocco.paytabs.com",
    QAT: "https://secure-doha.paytabs.com",
    PAK: "https://secure-pak.paytabs.com",
    GLOBAL: "https://secure-global.paytabs.com"
};

const host = () => {
    const region = (process.env.PAYTABS_REGION || "GLOBAL").toUpperCase();
    return REGION_HOSTS[region] || REGION_HOSTS.GLOBAL;
};

const serverKey = () => process.env.PAYTABS_SERVER_KEY || "";
const profileId = () => process.env.PAYTABS_PROFILE_ID || "";

const configured = Boolean(serverKey() && profileId());

async function post(endpoint, payload) {

    if (!configured) {
        throw new Error("PayTabs not configured. Add PAYTABS_PROFILE_ID and PAYTABS_SERVER_KEY in .env");
    }

    const response = await fetch(host() + endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: serverKey() // raw server key, not Bearer
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data) {
        throw new Error("PayTabs API error: " + (data && (data.message || data.detail)) || response.status);
    }

    return data;

}

// Step 1: create a hosted payment page for a plan checkout
async function createPaymentPage({ plan, reference, email, name, phone, callbackUrl, returnUrl }) {

    const customer = { name: name || "Valued Customer", email: email || "" };

    if (phone) customer.phone = phone;

    const data = await post("/payment/request", {
        profile_id: Number(profileId()),
        tran_type: "sale",
        tran_class: "ecom",
        cart_id: reference,
        cart_currency: process.env.PAYTABS_CURRENCY || "USD",
        cart_amount: plan.price,
        cart_description: plan.name + " Plan - " + plan.description,
        customer_details: customer,
        hide_shipping: true,
        callback: callbackUrl,
        return: returnUrl
    });

    if (!data.redirect_url) {
        throw new Error(data.message || data.detail || "No redirect_url from PayTabs");
    }

    return {
        tran_ref: data.tran_ref,
        redirect_url: data.redirect_url
    };

}

// Step 2: verify the real transaction state (authoritative source of truth)
async function queryTransaction(tranRef) {

    const data = await post("/payment/query", {
        profile_id: Number(profileId()),
        tran_ref: tranRef
    });

    const result = data.payment_result || {};

    return {
        approved: result.response_status === "A",
        status: result.response_status || "",
        message: result.response_message || (data.message || "")
    };

}

// Callback payload verification: Signature header is HMAC-SHA256 of the
// raw body, keyed by the server key. Returns null if no header provided.
function verifySignature(bodyRaw, signatureHeader) {

    if (!signatureHeader) return null;

    try {

        const expected = crypto
            .createHmac("sha256", serverKey())
            .update(bodyRaw)
            .digest("hex");

        const a = Buffer.from(expected);
        const b = Buffer.from(String(signatureHeader).trim());

        return a.length === b.length && crypto.timingSafeEqual(a, b);

    } catch (e) {
        return false;
    }

}

module.exports = {
    configured,
    createPaymentPage,
    queryTransaction,
    verifySignature
};