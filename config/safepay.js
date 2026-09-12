require("dotenv").config();
const crypto = require("crypto");

const ENV = process.env.SAFEPAY_ENV === "production" ? "production" : "sandbox";
const SECRET_KEY = process.env.SAFEPAY_SECRET_KEY || "";
const API_KEY = process.env.SAFEPAY_API_KEY || "";
const WEBHOOK_SECRET = process.env.SAFEPAY_WEBHOOK_SECRET || "";
const CURRENCY = process.env.SAFEPAY_CURRENCY || "USD";

const host = ENV === "production"
    ? "https://api.getsafepay.com"
    : "https://sandbox.api.getsafepay.com";

const safepay = SECRET_KEY
    ? require("@sfpy/node-core")(SECRET_KEY, { authType: "secret", host })
    : null;

const configured = Boolean(safepay && API_KEY);

// Step 1: create a payment session (tracker) + auth token + hosted checkout URL
async function createCheckout({ plan, orderId, redirectUrl, cancelUrl }) {

    if (!configured) {
        throw new Error("Safepay not configured. Add SAFEPAY_SECRET_KEY and SAFEPAY_API_KEY in .env");
    }

    const amount = Math.round(plan.price * 100);

    const session = await safepay.payments.session.setup({
        merchant_api_key: API_KEY,
        intent: "CYBERSOURCE",
        mode: "payment",
        entry_mode: "raw",
        currency: CURRENCY,
        amount,
        metadata: { order_id: orderId, plan: plan.code }
    });

    const tracker = session && session.data && session.data.tracker && session.data.tracker.token;

    if (!tracker) {
        throw new Error("Safepay: no tracker token in session response");
    }

    const authRes = await safepay.client.passport.create();

    const tbt = authRes && (authRes.data || authRes.token);

    if (!tbt) {
        throw new Error("Safepay: no authentication token");
    }

    const url = safepay.checkout.createCheckoutUrl({
        env: ENV,
        tracker,
        tbt,
        source: "hosted",
        redirect_url: redirectUrl,
        cancel_url: cancelUrl
    });

    return {
        tracker,
        checkout_url: url,
        expected_amount: amount
    };

}

// Step 2: verify the tracker's real state (TRACKER_ENDED = paid)
async function verifyTracker(tracker) {

    if (!configured) {
        throw new Error("Safepay not configured");
    }

    const res = await safepay.reporter.payments.fetch(tracker);

    const trackerData = res && res.data && (res.data.tracker || res.data);

    return {
        approved: trackerData && trackerData.state === "TRACKER_ENDED",
        state: (trackerData && trackerData.state) || ""
    };

}

// Webhook payload verification: x-sfpy-signature is HMAC-SHA512 of the
// raw body keyed by the webhook secret. Returns null when no header/secret.
function verifyWebhookSignature(bodyRaw, signatureHeader) {

    if (!WEBHOOK_SECRET || !signatureHeader) return null;

    try {

        const expected = crypto
            .createHmac("sha512", WEBHOOK_SECRET)
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
    ENV,
    CURRENCY,
    createCheckout,
    verifyTracker,
    verifyWebhookSignature
};