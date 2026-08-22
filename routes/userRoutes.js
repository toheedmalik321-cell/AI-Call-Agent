const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");

const {
  validateRegister,
  validateLogin,
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

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/resend-verification", resendVerificationEmail);
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