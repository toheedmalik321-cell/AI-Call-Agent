require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/user");
const app = express();

// Middleware
app.use(express.json());

// Check if MONGO_URI exists
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in .env file");
  process.exit(1);
}


// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log("✅ MongoDB Connected Successfully!");
  })
  .catch((err) => {
    console.log("❌ MongoDB Connection Failed!");
    console.log("Error Name:", err.name);
    console.log("Error Message:", err.message);
  });

// Home Route
app.get("/", (req, res) => {
  res.send("Welcome to AI Call Agent");
});

// About Route
app.get("/about", (req, res) => {
  res.send("This backend is developed by YOU");
});

// Contact Route
app.get("/contact", (req, res) => {
  res.send("Contact: support@aicallagent.com");
});

// Hello Route
app.get("/hello", (req, res) => {
  res.send("Hello, Welcome to My Backend Course!");
});

// Register Route
app.post("/register", async (req, res) => {
  try {
    const user = await User.create(req.body);

    res.status(201).json({
      success: true,
      message: "User Registered Successfully!",
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});