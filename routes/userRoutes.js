const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");

const {
  validateRegister,
  validateLogin,
  validateResetToken,
} = require("../validators/authValidator");

const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  verifyEmail,
  resendVerificationEmail
} = require("../controllers/userController");


// Public Routes

const { authLimiter, emailLimiter } = require("../middlewares/rateLimiter");

router.post("/register", authLimiter, validateRegister, register);
router.post("/login", authLimiter, validateLogin, login);
router.post("/forgot-password", emailLimiter, forgotPassword);
router.post("/reset-password/:token", authLimiter, validateResetToken, resetPassword);
router.post("/resend-verification", emailLimiter, resendVerificationEmail);
// Protected Routes
router.get("/forgot-password", (req, res) => {
    res.render("forgot-password");
});
router.get("/reset-password/:token", (req, res) => {
    res.render("reset-password", {
        token: req.params.token
    });
});
router.get("/verify-email/:token", verifyEmail);
router.get("/users", auth, getUsers);
router.get("/users/:id", auth, getUserById);
router.put("/users/:id", auth, updateUser);
router.delete("/users/:id", auth, deleteUser);

module.exports = router;