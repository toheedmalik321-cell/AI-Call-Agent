// Brevo (Sendinblue) transactional email via HTTPS API.
// Render free tier blocks all outbound SMTP ports (25/465/587), so we use
// Brevo's REST API over port 443 instead of nodemailer.

async function sendMail({ from, to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not set");
  }

  const body = {
    sender: { email: from },
    to: [{ email: to }],
    subject,
  };
  if (html) body.htmlContent = html;
  if (text) body.textContent = text;

  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Brevo API error ${resp.status}: ${detail}`);
  }
  return resp.json();
}

module.exports = sendMail;