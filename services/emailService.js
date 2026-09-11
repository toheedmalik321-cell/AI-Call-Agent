const nodemailer = require("nodemailer");
const dns = require("dns").promises;

// Resolve smtp.gmail.com to an IPv4 address ourselves.
// Nodemailer's internal DNS resolver can pick the IPv6 address, and Render's
// free tier has no IPv6 route → "connect ENETUNREACH <ipv6>". Pinning the
// IPv4 literal (with tls.servername for correct SNI) avoids that entirely.
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
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Correct SNI even though we connect to an IP literal
    tls: {
      servername: "smtp.gmail.com"
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000
  });

  return transporter;
}

let transporterPromise = null;

// Send mail through the (async-initialized) transport.
// Controllers call `sendMail(...)` directly; the transport promise lets us
// wait for DNS/transport setup before the first email is actually sent.
async function sendMail(mailOptions) {
  if (!transporterPromise) {
    transporterPromise = createTransporter();
  }
  const transporter = await transporterPromise;
  return transporter.sendMail(mailOptions);
}

module.exports = sendMail;