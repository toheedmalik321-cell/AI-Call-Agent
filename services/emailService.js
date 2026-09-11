const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    // Explicit config so we can force IPv4 (family: 4).
    // Render's free tier has no IPv6 route, so Gmail SMTP otherwise fails
    // with "connect ENETUNREACH <ipv6-addr>".
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Force IPv4 only (Render free tier cannot reach Gmail over IPv6).
    family: process.env.FORCE_IPV4 === "false" ? undefined : 4,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000
});

module.exports = transporter;