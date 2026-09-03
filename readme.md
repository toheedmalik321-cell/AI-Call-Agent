# 🤖 AI CallHub

> An AI-powered voice & chat sales assistant platform — Final Year Project (FYP)

AI CallHub is a full-stack web application that lets businesses create **AI sales agents** that talk to customers over **live phone calls**, answer questions from their **own knowledge base** (PDF/DOCX), and chat in real time. Every call gets an **AI-generated summary**, a **dashboard with charts**, and an optional **audio recording** playable back in the browser.

---

## ✨ Features

### 🤖 AI Sales Agents
- Create multiple AI agents, each with a role, company name & greeting ("TechLite Computers Sales Agent")
- Active agent answers every incoming call/chat automatically

### 📚 Smart Knowledge Base
- Upload **PDF / DOCX** documents
- AI searches + answers strictly from your uploaded knowledge (grounded answers, no hallucinations of facts)

### 📞 Live Voice Calls (Twilio)
- One-click call from the dashboard to your phone
- Two-way AI + customer conversation with real-time transcription
- **Audio recording** of the whole call, playable in the browser

### 🧠 AI Call Summary
- After every call, AI auto-generates a 5-section summary:
  Customer Need · Agent's Response · Objection · Outcome · Next Step

### 📊 Dashboard Analytics
- Weekly call volume line chart (last 7 days)
- Call status doughnut chart (completed / failed / pending / calling)

### 💬 Real-time Chat
- Asymmetric WebSocket chat between customer and AI agent

### 👤 Authentication & Security
- JWT-based login, account verification email, password reset
- Role-aware access, token expiry handling

### 💳 Subscriptions (optional)
- Stripe payment + mock mode for demos

---

## 🛠 Tech Stack

| Layer      | Technology |
|------------|------------|
| Backend    | Node.js + Express |
| Database   | MongoDB + Mongoose |
| AI         | Google Gemini (primary) + OpenAI (fallback) |
| Voice      | Twilio Voice + Ngrok |
| Chat       | WebSocket (`ws`) |
| Payments   | Stripe (mock/live) |
| Frontend   | EJS + Tailwind CSS + Chart.js |
| Auth       | JSON Web Tokens (JWT) + bcrypt |

---

## 📁 Project Structure

```
ai-call-agent/
├── .env.example          # Copy to .env and fill values
├── index.js              # Server entry point
├── config/               # DB connection
├── models/               # Mongoose schemas (User, Call, Agent, Knowledge...)
├── controllers/          # Business logic per resource
├── routes/               # Express routers
├── middlewares/          # auth, errorHandler
├── services/             # AI logic (aiService, promptService)
├── validators/           # Input validation
├── uploads/              # Uploaded knowledge files (git-ignored)
└── AI-CallHub/           # Frontend (EJS views, JS, CSS, assets)
```

---

## 🚀 Getting Started

### 1️⃣ Prerequisites
- **Node.js** v18+ (v22 recommended) — [nodejs.org](https://nodejs.org)
- **MongoDB** — [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier)
- **Gemini API Key** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **Twilio account** + a verified phone number — [console.twilio.com](https://console.twilio.com)
- **Ngrok** (expose local server for Twilio webhooks) — [ngrok.com](https://ngrok.com)

### 2️⃣ Clone & Install
```bash
git clone <your-repo-url>
cd ai-call-agent
npm install
```

### 3️⃣ Configure Environment
```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```
Then edit `.env` and fill in your keys (MongoDB URI, Gemini key, Twilio keys...).

### 4️⃣ Start the Server
```bash
npm run dev     # development (auto-restart)
# or
npm start       # production
```
Server runs at **http://localhost:3000**

### 5️⃣ Expose to Twilio (for voice calls)
In a **second terminal**:
```bash
ngrok http 3000
```
Copy the generated `https://xxx.ngrok-free.app` URL into your `.env` as `NGROK_URL`, then **restart** the server.

> ⚠️ On the **Twilio free trial**, calls only work to **verified numbers** (your `MY_PHONE_NUMBER` must be verified in the Twilio console). Upgrade your account or verify the number to call any phone.

---

## 📞 How Voice Calls Work (Flow)

```
You click "Call" in the dashboard
        │
        ▼
Express → Twilio API -> places CALL to your phone
        │
        ▼
Twilio hits webhook:  /voice?userId=...   (via Ngrok)
        │
        ▼
TwiML plays Agent greeting → listens → you speak
        │
        ▼
Transcription → sent to Gemini/OpenAI → AI reply spoken back
        │
        ▼
On "completed": AI Call Summary generated + saved
        │
        ▼
Recording (enabled) → forwarded to /api/calls/recording-callback
        │
        ▼
Saved to Call (recordingUrl) → playable on the Call Details page
```

---

## 🔌 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/agents` | Create agent |
| GET  | `/api/agents` | List my agents |
| POST | `/api/calls` | Create a browser "AI call" |
| GET  | `/api/calls` | List my calls |
| GET  | `/api/calls/:id` | Single call (summary, recordingUrl) |
| POST | `/api/calls/recording-callback` | Twilio recording webhook |
| GET  | `/api/calls/:id/recording?token=` | Stream call audio |
| GET  | `/api/dashboard/stats` | Chart data (weekly + status) |
| POST | `/voice` | Twilio TwiML (incoming call) |

---

## ✅ Available Demo Account

For quick testing of the dashboard & charts:
- **Email:** `fyp.test.demo@gmail.com`
- **Password:** `Test@12345`

This demo account has a sales agent, a laptop catalog knowledge base, and sample call history with a populated dashboard.

---

## ⚠️ Notes about AI Providers
- **Gemini** is the primary AI (free tier ~5 requests/min).
- **OpenAI** is used as an automatic fallback if Gemini fails or credits run out.
- If a call is made without either AI response, the raw transcript text is used as the summary fallback so the app never breaks.

---

## 📄 License
This is an academic Final Year Project and is not licensed for production commercial use without permission.

---

Made with ❤️ for the **Final Year Project**.
