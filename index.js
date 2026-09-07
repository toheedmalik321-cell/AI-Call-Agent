
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
    res.send("This backend is developed by YOU");
});

app.get("/contact", (req, res) => {
    res.send("Contact: support@aicallagent.com");
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