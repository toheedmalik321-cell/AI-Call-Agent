const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const User = require("../models/user");
const plans = require("../config/plans");
const stripe = require("../config/stripe");
const paytabs = require("../config/paytabs");

const BASE = process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "http://localhost:" + (process.env.PORT || 3000);
const PAYMENT_MODE = process.env.PAYMENT_MODE || "stripe";

// ==============================
// GET /api/plans
// Plans list + user's current subscription
// ==============================

router.get("/api/plans", auth, async (req, res) => {

    try {

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            data: {
                mode: PAYMENT_MODE,
                current: {
                    plan: user.plan,
                    status: user.subscriptionStatus,
                    periodEnd: user.currentPeriodEnd || null
                },
                plans
            }
        });

    } catch (err) {

        console.log(err);
        res.status(500).json({ success: false, message: err.message });

    }

});

// ==============================
// GET /api/subscription/status
// Force re-sync status from Stripe (works even without webhooks)
// ==============================

router.get("/api/subscription/status", auth, async (req, res) => {

    try {

        if (!stripe && !paytabs.configured && PAYMENT_MODE !== "mock") {
            return res.status(503).json({ success: false, message: "Payment gateway not configured. Add STRIPE_SECRET_KEY or PayTabs keys in .env" });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // PayTabs: verify a pending checkout via /payment/query
        // (authoritative, so the plans page works even if the callback was missed)
        if (PAYMENT_MODE === "paytabs" && user.paytabsTranRef && user.paytabsPlan &&
            user.subscriptionStatus !== "active") {

            try {

                const result = await paytabs.queryTransaction(user.paytabsTranRef);

                if (result.approved) {

                    user.plan = user.paytabsPlan;
                    user.subscriptionStatus = "active";
                    user.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    user.paytabsCartId = "";
                    user.paytabsTranRef = "";
                    user.paytabsPlan = "";
                    await user.save();

                }

            } catch (e) {
                console.log("PayTabs query error:", e.message);
            }

        }

        // Sync from saved checkout session (works without webhook)
        if (user.stripeSessionId && !user.stripeSubscriptionId) {

            try {

                const session = await stripe.checkout.sessions.retrieve(user.stripeSessionId);

                if (session.status === "complete" && session.payment_status === "paid") {

                    user.plan = session.metadata.plan || "pro";
                    user.stripeSubscriptionId = session.subscription || "";
                    user.stripeSessionId = "";
                    user.subscriptionStatus = "active";

                    if (session.subscription) {
                        const sub = await stripe.subscriptions.retrieve(session.subscription);
                        user.currentPeriodEnd = sub.current_period_end
                            ? new Date(sub.current_period_end * 1000)
                            : undefined;
                    }

                    await user.save();
                }

            } catch (e) {
                console.log("Session sync error:", e.message);
            }

        }

        if (user.stripeSubscriptionId) {

            const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

            user.subscriptionStatus = sub.status;
            user.currentPeriodEnd = sub.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : undefined;

            if (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete") {
                user.plan = "free";
            }

            await user.save();
        }

        res.json({
            success: true,
            data: {
                plan: user.plan,
                status: user.subscriptionStatus,
                periodEnd: user.currentPeriodEnd || null
            }
        });

    } catch (err) {

        console.log(err);
        res.status(500).json({ success: false, message: err.message });

    }

});

// ==============================
// POST /api/subscribe
// Start Stripe Checkout for a plan (monthly subscription)
// ==============================

router.post("/api/subscribe", auth, async (req, res) => {

    try {

        const { code } = req.body;

        const plan = plans.find(p => p.code === code);

        if (!plan) {
            return res.status(400).json({ success: false, message: "Invalid plan" });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Already on this active plan
        if (user.plan === plan.code &&
            ["active", "trialing"].includes(user.subscriptionStatus)) {

            return res.json({ success: true, data: { url: "/plans", alreadyActive: true } });

        }

        // Free plan = cancel any paid subscription (downgrade)
        if (plan.code === "free") {

            if (user.stripeSubscriptionId) {

                if (!stripe) {
                    return res.status(503).json({ success: false, message: "Stripe not configured" });
                }

                try {
                    await stripe.subscriptions.cancel(user.stripeSubscriptionId);
                } catch (e) {
                    console.log("Cancel sub error:", e.message);
                }
            }

            user.plan = "free";
            user.subscriptionStatus = "none";
            user.stripeSubscriptionId = "";
            user.stripeSessionId = "";
            user.currentPeriodEnd = undefined;
            await user.save();

            return res.json({ success: true, data: { url: "/plans", downgraded: true } });

        }

        // MOCK gateway (demo, no Stripe needed)
        if (PAYMENT_MODE === "mock") {

            return res.json({
                success: true,
                data: {
                    mock: true,
                    code: plan.code,
                    name: plan.name,
                    priceLabel: plan.priceLabel,
                    price: plan.price
                }
            });

        }

        // PAYTABS gateway: hosted payment page (Pakistan-friendly)
        if (PAYMENT_MODE === "paytabs") {

            if (!paytabs.configured) {
                return res.status(503).json({ success: false, message: "PayTabs not configured. Add PAYTABS_PROFILE_ID and PAYTABS_SERVER_KEY in .env" });
            }

            try {

                const reference = user._id.toString() + "-" + Date.now();
                const callbacks = {
                    plan,
                    reference,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    callbackUrl: process.env.PAYTABS_CALLBACK_URL || (BASE + "/api/paytabs/callback"),
                    returnUrl: BASE + "/plans?success=1"
                };

                const page = await paytabs.createPaymentPage(callbacks);

                user.paytabsCartId = reference;
                user.paytabsTranRef = page.tran_ref;
                user.paytabsPlan = plan.code;
                await user.save();

                return res.json({ success: true, data: { url: page.redirect_url } });

            } catch (err) {

                console.log(err);
                return res.status(502).json({ success: false, message: "PayTabs checkout failed: " + err.message });

            }

        }

        if (!stripe) {
            return res.status(503).json({ success: false, message: "Stripe not configured. Add STRIPE_SECRET_KEY in .env" });
        }

        // Already has a paid subscription → go to portal instead
        if (user.stripeSubscriptionId) {
            return res.json({ success: true, data: { url: "/subscription/portal", usePortal: true } });
        }

        // Get or create Stripe customer
        let customerId = user.stripeCustomerId;

        if (!customerId) {

            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: { userId: user._id.toString() }
            });

            customerId = customer.id;
            user.stripeCustomerId = customerId;
            await user.save();

        }

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            customer: customerId,
            client_reference_id: user._id.toString(),
            metadata: { plan: plan.code },
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        unit_amount: plan.price * 100,
                        recurring: { interval: plan.interval || "month" },
                        product_data: {
                            name: plan.name + " Plan",
                            description: plan.description
                        }
                    },
                    quantity: 1
                }
            ],
            success_url: BASE + "/plans?success=1",
            cancel_url: BASE + "/plans?cancel=1"
        });

        user.stripeSessionId = session.id;
        await user.save();

        res.json({ success: true, data: { url: session.url } });

    } catch (err) {

        console.log(err);
        res.status(500).json({ success: false, message: err.message });

    }

});

// ==============================
// POST /api/subscription/mock-pay
// Mock gateway: simulate successful payment (demo only)
// ==============================

router.post("/api/subscription/mock-pay", auth, async (req, res) => {

    try {

        if (PAYMENT_MODE !== "mock") {
            return res.status(400).json({ success: false, message: "Mock mode is off" });
        }

        const { code } = req.body;

        const plan = plans.find(p => p.code === code);

        if (!plan || plan.code === "free") {
            return res.status(400).json({ success: false, message: "Invalid plan" });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Simulate processing delay
        await new Promise(r => setTimeout(r, 1500));

        user.plan = plan.code;
        user.subscriptionStatus = "active";
        user.stripeSubscriptionId = "";
        user.stripeSessionId = "";
        user.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await user.save();

        res.json({
            success: true,
            message: "Payment successful! " + plan.name + " plan is active."
        });

    } catch (err) {

        console.log(err);
        res.status(500).json({ success: false, message: err.message });

    }

});

// ==============================
// POST /api/subscription/portal
// Stripe customer portal (manage / cancel subscription)
// ==============================

router.post("/api/subscription/portal", auth, async (req, res) => {

    try {

        if (!stripe) {
            return res.status(503).json({ success: false, message: "Stripe not configured" });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (!user.stripeCustomerId) {
            return res.status(400).json({ success: false, message: "No payment account yet. Subscribe first." });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: BASE + "/plans"
        });

        res.json({ success: true, data: { url: session.url } });

    } catch (err) {

        console.log(err);
        res.status(500).json({ success: false, message: err.message });

    }

});

// ==============================
// POST /api/subscription/cancel
// Cancel instantly (downgrade to Free)
// ==============================

router.post("/api/subscription/cancel", auth, async (req, res) => {

    try {

        if (!stripe && !paytabs.configured && PAYMENT_MODE !== "mock") {
            return res.status(503).json({ success: false, message: "Payment gateway not configured" });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.stripeSubscriptionId && stripe) {
            try {
                await stripe.subscriptions.cancel(user.stripeSubscriptionId);
            } catch (e) {
                console.log("Cancel sub error:", e.message);
            }
        }

        user.plan = "free";
        user.subscriptionStatus = "none";
        user.stripeSubscriptionId = "";
        user.stripeSessionId = "";
        user.paytabsCartId = "";
        user.paytabsTranRef = "";
        user.paytabsPlan = "";
        user.currentPeriodEnd = undefined;
        await user.save();

        res.json({ success: true, message: "Subscription cancelled" });

    } catch (err) {

        console.log(err);
        res.status(500).json({ success: false, message: err.message });

    }

});

// ==============================
// Stripe Webhook (raw body is required for signature)
// ==============================

const stripeWebhook = async (req, res) => {

    if (!stripe) {
        return res.status(503).json({ success: false, message: "Stripe not configured" });
    }

    let event;

    try {

        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            return res.status(400).json({ success: false, message: "STRIPE_WEBHOOK_SECRET missing in .env" });
        }

        event = stripe.webhooks.constructEvent(
            req.body,
            req.headers["stripe-signature"],
            process.env.STRIPE_WEBHOOK_SECRET
        );

    } catch (err) {

        console.log("Webhook signature error:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);

    }

    try {

        const data = event.data.object;

        switch (event.type) {

            case "checkout.session.completed": {

                if (!data.client_reference_id) break;

                const user = await User.findById(data.client_reference_id);
                if (user) {

                    user.plan = data.metadata.plan || "pro";
                    user.stripeCustomerId = data.customer;
                    user.stripeSubscriptionId = data.subscription;
                    user.subscriptionStatus = "active";

                    if (data.subscription) {
                        try {
                            const sub = await stripe.subscriptions.retrieve(data.subscription);
                            user.currentPeriodEnd = sub.current_period_end
                                ? new Date(sub.current_period_end * 1000)
                                : undefined;
                        } catch (e) {
                            console.log("Retrieve sub error:", e.message);
                        }
                    }

                    await user.save();
                }

                break;
            }

            case "customer.subscription.updated":
            case "customer.subscription.created": {

                const user = await User.findOne({ stripeSubscriptionId: data.id });
                if (user) {

                    user.subscriptionStatus = data.status;
                    user.currentPeriodEnd = data.current_period_end
                        ? new Date(data.current_period_end * 1000)
                        : undefined;

                    if (["canceled", "unpaid", "incomplete"].includes(data.status)) {
                        user.plan = "free";
                    }

                    await user.save();
                }

                break;
            }

            case "customer.subscription.deleted": {

                const user = await User.findOne({ stripeSubscriptionId: data.id });
                if (user) {

                    user.plan = "free";
                    user.subscriptionStatus = "none";
                    user.stripeSubscriptionId = "";
                    user.currentPeriodEnd = undefined;
                    await user.save();
                }

                break;
            }

            default:
                break;
        }

        res.json({ received: true });

    } catch (err) {

        console.log("Webhook handler error:", err.message);
        res.status(500).json({ success: false, message: err.message });

    }

};

module.exports = router;
module.exports.stripeWebhook = stripeWebhook;

// ==============================
// PayTabs Callback (raw body required for signature)
// PayTabs posts the transaction result here — we re-verify
// with /payment/query before trusting anything.
// ==============================

const paytabsCallback = async (req, res) => {

    if (PAYMENT_MODE !== "paytabs" || !paytabs.configured) {
        return res.status(503).send("PayTabs not configured");
    }

    const raw = req.body;

    if (!Buffer.isBuffer(raw) || !raw.length) {
        return res.status(400).send("Empty body");
    }

    const body = JSON.parse(raw.toString("utf8"));

    const sigOk = paytabs.verifySignature(raw, req.headers.signature);

    if (sigOk === false) {
        return res.status(400).send("Signature mismatch");
    }

    const tranRef = body.tran_ref;

    if (!tranRef) {
        return res.status(400).send("No tran_ref");
    }

    try {

        const result = await paytabs.queryTransaction(tranRef);
        const user = await User.findOne({ paytabsTranRef: tranRef });

        if (user && result.approved && user.paytabsPlan) {
            user.plan = user.paytabsPlan;
            user.subscriptionStatus = "active";
            user.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            user.paytabsCartId = "";
            user.paytabsTranRef = "";
            user.paytabsPlan = "";
            await user.save();
        }

        res.send("OK");

    } catch (err) {

        console.log("PayTabs callback error:", err.message);
        res.status(500).send("Error");

    }

};

module.exports.paytabsCallback = paytabsCallback;