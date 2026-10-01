// =============================================================================
// authValidator.js - Input validation & sanitisation
//
// Prevents: malformed emails, weak passwords, over-long inputs, and any
// injection of unexpected types into the auth layer.
// =============================================================================

// Practical email shape check (no RFC 5322 kitchen-sink, just what we need)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

const isValidEmail = (value) =>
    typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value.trim());

const sanitiseString = (value, max = 100) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

const validateRegister = (req, res, next) => {
    const name = sanitiseString(req.body.name, 80);
    const email = sanitiseString(req.body.email, 254).toLowerCase();
    const password = req.body.password;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields are required",
        });
    }

    if (name.length < 2) {
        return res.status(400).json({
            success: false,
            message: "Name must be at least 2 characters",
        });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            message: "Please provide a valid email address",
        });
    }

    if (typeof password !== "string" || password.length < PASSWORD_MIN) {
        return res.status(400).json({
            success: false,
            message: `Password must be at least ${PASSWORD_MIN} characters`,
        });
    }

    if (password.length > PASSWORD_MAX) {
        return res.status(400).json({
            success: false,
            message: `Password must be at most ${PASSWORD_MAX} characters`,
        });
    }

    // Contains at least one letter and one number - blocks "aaaaaaaa"
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({
            success: false,
            message: "Password must contain at least one letter and one number",
        });
    }

    // Normalise so the controller stores clean values
    req.body.name = name;
    req.body.email = email;
    req.body.password = password;

    next();
};

const validateLogin = (req, res, next) => {
    const email = sanitiseString(req.body.email, 254).toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and Password are required",
        });
    }

    // Do not leak whether the format was the problem - keep it a generic 400
    if (!isValidEmail(email) || typeof password !== "string" || password.length > PASSWORD_MAX) {
        return res.status(400).json({
            success: false,
            message: "Invalid email or password",
        });
    }

    req.body.email = email;

    next();
};

// Guard for password reset token in the URL
const validateResetToken = (req, res, next) => {
    const token = sanitiseString(req.params.token, 200);
    if (!token || token.length < 20) {
        return res.status(400).json({
            success: false,
            message: "Invalid or expired reset link",
        });
    }
    req.params.token = token;
    next();
};

module.exports = {
    validateRegister,
    validateLogin,
    validateResetToken,
};