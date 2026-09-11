const nodemailer = require("nodemailer");
const dns = require("dns").promises;

async function resolveGmailIPv4() {
  try {
    const res = await dns.lookup("smtp.gmail.com", { family: 4, all: true });
    if (res && res.length) {
      return res[0].address;
    }
  } catch (e) {
    console.warn("[email] IPv4 lookup failed, falling back to hostname:", e.message);
  }
  return "smtp.gmail.com";
}

async function createTransporter() {
  const host = await resolveGmailIPv4();
  console.log("[email] SMTP host:", host);

  const transporter = nodemailer.createTransport({
    host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Start TLS explicitly on port 587
    requireTLS: true,
    tls: {
      servername: "smtp.gmail.com"
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000
  });

  return transporter;
}

let transporterPromise = null;

async function sendMail(mailOptions) {
  if (!transporterPromise) {
    transporterPromise = createTransporter();
  }
  const transporter = await transporterPromise;
  return transporter.sendMail(mailOptions);
}

module.exports = sendMail;