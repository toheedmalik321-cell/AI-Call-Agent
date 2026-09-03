# 🏗️ AI CallHub — System Architecture

This document explains how the system is organized and how a request flows through it.

---

## 1. High-Level Overview

```
                        ┌──────────────────────────────────────────────┐
                        │                 CLIENT (Browser)              │
                        │   EJS views + Tailwind + Chart.js + WebSocket │
                        └──────────────┬───────────────────────────────┘
                                       │  HTTPS / JSON
                                       ▼
                        ┌──────────────────────────────────────────────┐
                        │            EXPRESS SERVER (index.js)          │
                        │  routes ─▶ controllers ─▶ services ─▶ models  │
                        └───┬─────────┬───────────┬───────────┬─────────┘
                            │         │           │           │
               ┌────────────▼──┐  ┌───▼─────────┐ │  ┌────────▼────────┐
               │   MongoDB      │  │ Gemini/OpenAI│ │  │   Twilio Voice  │
               │   (Mongoose)   │  │   (AI)       │ │  │  + Ngrok tunnel │
               └───────────────┘  └─────────────┘ │  └─────────────────┘
                                                   │    Stripe (payments)
                                                   ▼
                                            WebSocket (chat)
```

**Three "personalities":**
1. **Web/API** — browser ↔ Express ↔ MongoDB ↔ AI (auth, agents, calls, dashboard)
2. **Voice** — Twilio ↔ Ngrok ↔ Express ↔ AI ↔ audio recording
3. **Chat (real-time)** — WebSocket ↔ Express ↔ AI

---

## 2. Folder Responsibilities

```
index.js
  └── Express app: static files, JSON parsing, EJS rendering, route mounting,
      error handler, server bootstrap

config/
  └── db.js                  # Mongoose connection

models/
  ├── user.js                # User, JWT auth, verification
  ├── agent.js               # AI Sales Agent (role, company, greeting, active flag)
  ├── call.js                # Call record (customer, transcript, summary,
  │                          #   status, duration, twilioCallSid, recordingUrl)
  ├── knowledge.js           # Uploaded knowledge base entries
  ├── chat.js                # Chat messages
  └── chatSession.js         # Chat conversation sessions

controllers/                 # Business logic (thin layer between routes & services)
  ├── userController.js      # register / login / verify / profile
  ├── agentController.js     # CRUD agents
  ├── callController.js      # CRUD calls + recording callback + audio stream
  ├── dashboardController.js # dashboard statistics
  ├── knowledgeController.js # knowledge CRUD + upload
  ├── chatController.js      # chat endpoints
  ├── realtimeController.js  # WebSocket handlers
  ├── subscriptionController.js # Stripe plans/subscriptions
  └── twilioController.js    # Twilio TwiML (voice flow)

services/                    # Reusable business/AI logic
  ├── aiService.js           # generateAIResponse() + generateCallSummary()
  ├── promptService.js       # prompt templates (agent context + knowledge)
  ├── knowledgeService.js    # knowledge retrieval for grounding
  ├── pdfService.js          # PDF/DOCX text extraction (pdf-parse, mammoth)
  ├── emailService.js        # Nodemailer (verify/forgot password)
  └── twilioService.js       # Twilio client helpers

routes/                      # Thin Express routers -> controllers
middlewares/
  ├── auth.js                # JWT verification
  └── errorHandler.js        # central error handler

validators/                  # request body validation
uploads/                     # uploaded knowledge files (git-ignored)

AI-CallHub/                  # FRONTEND
  ├── views/                 # EJS templates (rendered server-side)
  ├── js/                    # browser JS (fetch + Chart.js + WebSocket)
  ├── css/                   # styles
  ├── assets/                # images/favicon
  └── libs/                  # client libraries
```

---

## 3. Request Lifecycle (Example: "Give me my calls")

```
1. Browser  ── GET /api/calls  +  Header: Authorization: Bearer <JWT>
2. routes/callRoutes.js   ── matches route
3. middlewares/auth.js    ── verifies JWT, attaches req.user.id
4. controllers/callController.js ── getCalls()
5. models/call.js         ── Call.find({ user: req.user.id }).populate("agent")
6. MongoDB returns docs   ── express .json() sends response
```

---

## 4. Voice Call Flow (Twilio + AI + Recording)

```
User clicks "Call on Phone" in dashboard
   │
   ▼
twilioController.startCall()
   • client.calls.create({ to: MY_PHONE_NUMBER,
                           url: NGROK_URL + "/voice?userId=...",
                           record: true,
                           recordingStatusCallback: NGROK_URL + "/api/calls/recording-callback" })
   │
   ▼
Twilio rings YOUR phone ── on answer, calls back the `url` webhook
   │
   ▼
twilioController.incomingCall()
   • calls the phone number and answers it
   • creates a Call record (status: "calling", twilioCallSid saved)
   • builds TwiML: Agent greeting (<Say>) + <Gather input="speech"> to listen
   │
   ▼
Customer speaks ── Twilio sends speech input (to /voice speech handler)
   • aiService.generateAIResponse(customerText, agentRole, userId)
       - injects agent context + knowledge base into the prompt
       - calls Gemini (fallback: OpenAI)
   • TwiML <Say> speaks the AI reply out loud
   │
   ▼
Conversation continues until the user says goodbye / call ends
   │
   ▼
When call "completed":
   • twilioController builds final transcript
   • aiService.generateCallSummary() -> 5-section summary saved on the Call
   │
   ▼
Twilio finishes recording -> POST /api/calls/recording-callback
   • matches by twilioCallSid
   • saves recordingUrl on the Call
   │
   ▼
User opens Call Details page -> <audio> player UI
   • audio src = /api/calls/:id/recording?token=<JWT>
   • callController.streamRecording() fetches media from Twilio (with auth)
     and streams it to the browser
```

---

## 5. AI Summary Format

`generateCallSummary()` produces a structured summary with these sections:

```
Customer Need:
Agent's Response:
Objection:
Outcome:
Next Step:
```

**Robustness (fallback chain):**
1. Gemini → 2. OpenAI → 3. raw transcript substring
So a summary is **always** produced, even if an AI provider fails or has no credits.

---

## 6. AI Provider Strategy

```
generateAIResponse() / generateCallSummary()
      │
      ├── Primary:  Gemini  (gemini-2.5-flash)   ✓ fast, free tier
      │
      └── Fallback: OpenAI  (gpt-4.1-mini)       when Gemini fails / rate-limited
```

- Model names: Gemini `gemini-2.5-flash`, OpenAI `gpt-4.1-mini`
- Knowledge is injected into the prompt so answers stay grounded in your docs.
- `gpt-4.1-mini` is used (NOT the older `gpt-4-mini` which no longer resolves).

---

## 7. Database Schema (Core Models)

**Call**
```
user           ObjectId → User
agent          ObjectId → Agent
customerName   String
phoneNumber    String
customerMessage, aiReply, transcript, callSummary   String
status         String   (completed / failed / pending / calling)
duration       Number
startedAt / endedAt      Date
twilioCallSid  String
recordingSid   String
recordingUrl   String
```

**Agent**
```
user           ObjectId → User
companyName, role, greeting   String
isActive       Boolean
knowledge      [ObjectId]  (linked knowledge entries)
```

---

## 8. Security Notes
- Passwords hashed with **bcrypt**.
- Routes protected with **JWT** (`middlewares/auth.js`).
- `.env` holds all secrets and is **git-ignored** — never commit it.
- The recording **stream** endpoint verifies the JWT (`?token=`) before returning audio, so recordings are private to their owner.
