
require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const morgan = require("morgan");

const connectDB = require("./config/db");

const userRoutes = require("./routes/userRoutes");
const callRoutes = require("./routes/callRoutes");
const aiRoutes = require("./routes/aiRoutes");
const agentRoutes = require("./routes/agentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const knowledgeRoutes = require("./routes/knowledgeRoutes");
const twilioRoutes = require("./routes/twilioRoutes");
const agoraRoutes = require("./routes/agoraRoutes");
const chatRoutes = require("./routes/chatRoutes");
const realtimeRoutes = require("./routes/realtimeRoutes");
const profileRoutes = require("./routes/profileRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");

const User = require("./models/user");
const auth = require("./middlewares/auth");
const errorHandler = require("./middlewares/errorHandler");
const sendMail = require("./services/emailService");

const app = express();

// ==============================
// Connect Database
// ==============================

if (!process.env.MONGO_URI) {
    console.log("❌ MONGO_URI Missing");
    process.exit(1);
}

connectDB();

// ==============================
// View Engine
// ==============================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "AI-CallHub", "views"));

// ==============================
// Ensure uploads directory exists (Render/cloud has no persistent filesystem)
// ==============================

const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ==============================
// Static Files
// ==============================

app.use("/css", express.static(path.join(__dirname, "AI-CallHub/css")));
app.use("/js", express.static(path.join(__dirname, "AI-CallHub/js")));
app.use("/assets", express.static(path.join(__dirname, "AI-CallHub/assets")));
app.use("/libs", express.static(path.join(__dirname, "AI-CallHub/libs")));

// ==============================
// Middleware
// ==============================

// Stripe webhook needs the RAW body before express.json() parses it
app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    subscriptionRoutes.stripeWebhook
);

// Safepay webhook needs the RAW body for HMAC signature check
app.post(
    "/api/safepay/webhook",
    express.raw({ type: "*/*" }),
    subscriptionRoutes.safepayWebhook
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

// ==============================
// EJS Pages
// ==============================

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/dashboard", (req, res) => {
    res.render("dashboard");
});

// ---------- Agents ----------

app.get("/agents", (req, res) => {
    res.render("agents");
});

app.get("/add-agent", (req, res) => {
    res.render("addAgent");
});

app.get("/edit-agent", (req, res) => {
    res.render("editAgent");
});

// ---------- Knowledge ----------

app.get("/knowledge", (req, res) => {
    res.render("knowledge");
});

app.get("/add-knowledge", (req, res) => {
    res.render("addKnowledge");
});

app.get("/view-knowledge", (req, res) => {
    res.render("viewKnowledge");
});
// ---------- Calls ----------

app.get("/calls", (req, res) => {
    res.render("calls");
});

app.get("/call-details", (req, res) => {
    res.render("call-details");
});
app.get("/add-call", (req, res) => {
    res.render("addCall");
});

// ---------- Chat & Voice ----------

app.get("/chat", (req, res) => {
    res.render("chat");
});

app.get("/voice", (req, res) => {
    res.render("voice");
});

app.get("/agora-call", (req, res) => {
    res.render("agora-call");
});

app.get("/verify-pending", (req, res) => {
    res.render("verify-pending");
});

// ==============================
// Other Routes
// ==============================

app.get("/about", (req, res) => {
    res.render("about");
});

app.get("/contact", (req, res) => {
    res.render("contact");
});

app.get("/privacy", (req, res) => {
    res.render("privacy");
});

app.get("/terms", (req, res) => {
    res.render("terms");
});

app.get("/hello", (req, res) => {
    res.send("Hello, Welcome to My Backend Course!");
});
app.get("/profile", (req, res) => {
    res.render("profile");
});
app.get("/plans", (req, res) => {
    res.render("plans");
});
app.get("/security", (req, res) => {
    res.render("security");
});
app.get("/blog", (req, res) => {
    res.render("blog");
});

// ==============================
// Landing page chat -> email
// ==============================

app.post("/api/landing-chat", express.json(), async (req, res) => {

    try {

        const { name, email, message } = req.body || {};

        if (!email || !message) {
            return res.status(400).json({
                success: false,
                message: "Name, email and message are required"
            });
        }

        const displayName = (name && name.trim()) ? name.trim() : "Website visitor";
        const replyTo = (email && typeof email === "string") ? email.trim() : "";

        const html = `
            <div style="font-family:Arial,Helvetica,sans-serif;padding:20px;max-width:600px">
                <h2 style="color:#10b981;margin-bottom:16px">New inquiry from the website</h2>
                <p><strong>Name:</strong> ${displayName.replace(/</g, "&lt;")}</p>
                <p><strong>Email:</strong> ${replyTo.replace(/</g, "&lt;")}</p>
                <p style="margin-top:16px"><strong>Message:</strong></p>
                <p style="background:#f3f4f6;padding:12px;border-radius:8px">${message.replace(/</g, "&lt;")}</p>
                <p style="color:#6b7280;margin-top:20px">Sent automatically from the AI CallHub website chat widget.</p>
            </div>
        `;

        await sendMail({
            from: process.env.BREVO_SENDER_EMAIL || "toheedmalik321@gmail.com",
            to: "toheedmalik321@gmail.com",
            subject: "Website chat: " + displayName.replace(/</g, "&lt;"),
            html
        });

        return res.json({ success: true, message: "Thanks! We'll get back to you soon." });

    } catch (err) {

        console.error("landing-chat error:", err);

        return res.status(500).json({
            success: false,
            message: "Could not send your message. Please try again or email us directly."
        });

    }

});
// ==============================
// API Routes
// ==============================

app.use("/", userRoutes);
app.use("/", callRoutes);
app.use("/", aiRoutes);
app.use("/", agentRoutes);
app.use("/", dashboardRoutes);
app.use("/", knowledgeRoutes);
app.use("/", twilioRoutes);
app.use("/", agoraRoutes);
app.use("/", chatRoutes);
app.use("/", realtimeRoutes);
app.use("/", profileRoutes);
app.use("/", subscriptionRoutes);
// ==============================
// 404 - Not Found
// ==============================

app.use((req, res) => {

    // API requests -> JSON error
    if (req.path.startsWith("/api")) {

        return res.status(404).json({
            success: false,
            message: "Route not found"
        });

    }

    // Page requests -> styled 404 page
    res.status(404).render("404");

});

// ==============================
// Error Handler
// ==============================

app.use(errorHandler);

// ==============================
// Start Server
// ==============================

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {

    console.log(`🚀 Server running at http://localhost:${PORT}`);

});