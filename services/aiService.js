const { getSystemPrompt } = require("./promptService");
const { GoogleGenAI } = require("@google/genai");
const OpenAI = require("openai");

const Agent = require("../models/agent");
const Knowledge = require("../models/knowledge");
const Chat = require("../models/chat");

// ===============================
// AI Clients
// ===============================

// Chat uses GEMINI_API_KEY; Calling uses GEMINI_CALL_API_KEY (fallback to GEMINI_API_KEY).
const getGeminiClient = (usage = "chat") => {
  const key =
    usage === "call"
      ? (process.env.GEMINI_CALL_API_KEY || process.env.GEMINI_API_KEY)
      : process.env.GEMINI_API_KEY;
  return key ? new GoogleGenAI({ apiKey: key }) : null;
};

const createOpenAIClient = (usage = "chat") => {
  const key =
    usage === "call"
      ? (process.env.OPENAI_CALL_API_KEY || process.env.OPENAI_API_KEY)
      : process.env.OPENAI_API_KEY;
  return key ? new OpenAI({ apiKey: key }) : null;
};

// ===============================
// Knowledge Search - FIX #1
// ===============================

const searchKnowledge = (query, knowledgeArray) => {

  if (!query || !knowledgeArray || knowledgeArray.length === 0) {
    return [];
  }

  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2);

  if (queryWords.length === 0) {
    return knowledgeArray;
  }

  // Score each knowledge item
  const scored = knowledgeArray.map(item => {

    let score = 0;

    const title = (item.title || "").toLowerCase();
    const content = (item.content || "").toLowerCase();
    const searchText = title + " " + content;

    // Exact phrase match (highest priority)
    if (searchText.includes(query.toLowerCase())) {
      score += 100;
    }

    // Word by word matching
    queryWords.forEach(word => {

      // Title match (high priority)
      if (title.includes(word)) {
        score += 20;
      }

      // Content match (medium priority)
      if (content.includes(word)) {
        score += 10;
      }

      // Word boundaries (exact word match)
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordRegex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const matches = searchText.match(wordRegex);
      if (matches) {
        score += matches.length * 5;
      }

    });

    return {
      item,
      score
    };

  });

  // Sort by score (highest first)
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.item);

};

// ===============================
// Local Rule-Based Fallback Reply
// (used when both Gemini and OpenAI are unavailable)
// ===============================

const getLocalReply = (userMessage, agent) => {

  const msg = (userMessage || "").toLowerCase();
  const company = (agent?.companyName || "our company");
  const instructions = (agent?.instructions || "").toLowerCase();
  const prefix = (agent?.role || "sales").toLowerCase().includes("reception") ? "Welcome to " + company + ". " : "";

  // ---- System-style greeting prompt (Agora greeting fallback) ----
  if (/(you are starting|new phone conversation|helpful assistant representing|open the call|start the sales)/i.test(msg)) {
    return prefix + "How can I help you today?";
  }

  // ---- Greeting (only when no real need is expressed) ----
  if (/(laptop|price|cost|installment|offer|delivery|which|recommend|want|need|buy)/i.test(msg)) {
    // skip greeting — go to the specific branch below
  } else if (/\b(hi|hello|hey|salam|assalam|good morning|good afternoon|good evening|namaste|how are you)\b/.test(msg)) {
    return prefix + "How can I help you today?";
  }

  // ---- End of call ----
  if (/(bye|goodbye|good bye|see you|that'?s all|thanks bye|thank you bye|end call|hang up|alvida|khuda hafiz)/.test(msg)) {
    return "Thank you for calling " + company + ". Have a great day!";
  }

  // ---- Price questions ----
  if (/(price|cost|kitne|kitna|rate|charges|expense|how much|bahrain|kima)\b/.test(msg)) {
    const products = extractProducts(instructions || knowledgeTextOf(agent));
    if (products.length > 0) {
      const list = products.map(p => p.name + " is " + p.price).join(", ");
      return prefix + "Our " + list + ". Which one suits your needs best?";
    }
    if (/(basic|simple|office|cheap|entry)/.test(msg)) {
      return prefix + "The Basic Laptop is $450 (or 12,000 PKR per month) with 8GB RAM and 256GB SSD. Would you like more details?";
    }
    return prefix + "I recommend the Pro Laptop at $750, or the Basic Laptop at $450. Which would you like to know more about?";
  }

  // ---- Installments ----
  if (/(installment|monthly|month|kist|qist|payment plan|finance)/.test(msg)) {
    return prefix + "We offer easy 12-month installments at no extra cost. For example, the Basic Laptop is 12,000 PKR per month. Would you like full details?";
  }

  // ---- Offer / warranty ----
  if (/(offer|discount|warranty|guarantee|free|deal)/.test(msg)) {
    return prefix + "We currently offer free 1-year warranty on every laptop, free delivery within Lahore, and a 7-day return policy. Would you like more details?";
  }

  // ---- Delivery ----
  if (/(delivery|shipping|reach|courier|location|address|lahore|karachi|islamabad)/.test(msg)) {
    return prefix + "We offer free delivery within Lahore and nationwide delivery across Pakistan. Where would you like your laptop delivered?";
  }

  // ---- Product recommendation / which laptop ----
  if (/(laptop|computer|recommend|suggest|best|which|konsa|kaunsa|choose|gaming|office|student)/.test(msg)) {
    if (/(gaming|game|heavy|gpu)/.test(msg)) {
      return prefix + "For gaming, I recommend the Gaming Laptop at $1200 with a dedicated GPU, 16GB RAM, and 1TB SSD. Would you like pricing in PKR?";
    }
    if (/(office|basic|simple|browse|ms office|word|internet)/.test(msg)) {
      return prefix + "For office work, the Basic Laptop at $450 is perfect — 8GB RAM, 256GB SSD, ideal for browsing and MS Office. Can I help with anything else?";
    }
    if (/(student|study|programming|developer|multitask)/.test(msg)) {
      return prefix + "For study and development, the Pro Laptop at $750 is great — 16GB RAM, 512GB SSD, and a faster processor. Would you like more details?";
    }
    return prefix + "For everyday use I recommend the Basic Laptop at $450, and for faster performance the Pro Laptop at $750. What do you mainly use the laptop for?";
  }

  // ---- General company question ----
  if (/ (what|product|about|kya |kyun|who|when|where) /.test(" " + msg + " ") || /(company|techlite|aap|services|sell)\b/.test(msg)) {
    return prefix + "We are " + company + ". We sell laptops and computer accessories with easy installments, free delivery in Lahore, and nationwide delivery. What would you like to know?";
  }

  // ---- Thank you ----
  if (/(thank|shukriya|thanks|great|good)\b/.test(msg)) {
    return prefix + "You're most welcome! Is there anything else I can help you with?";
  }

  // ---- Default ----
  return prefix + "I'd love to help with that. Could you tell me a bit more about what you need today?";

};

// Extract product names + prices from agent instructions / knowledge text
const extractProducts = (text) => {

  const products = [];

  const lines = (text || "").split(/\r?\n/);

  lines.forEach(line => {

    const trimmed = line.trim();

    // Match patterns like: "- Basic Laptop $450", "1. Pro Laptop $750", "Basic Laptop — $450"
    const match = trimmed.match(
      /([A-Z][A-Za-z]+(?:\s[A-Za-z]+){0,3})\s*(\([^)]*\)\s*)?(\$\s*\d[\d,]*(?:\.\d+)?|Rs\.?\s*\d[\d,]*|PKR\s*\d[\d,]*)/i
    );

    if (match && !/(product|price|list|policy|note|offer|warranty|installment|delivery|return)/i.test(match[1])) {
      const name = match[1].trim().replace(/\s+/g, " ");
      const price = match[3].trim().replace(/\s+/g, " ").toUpperCase();
      if (!products.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        products.push({ name, price });
      }
    }

  });

  return products.slice(0, 4);

};

// Used by getLocalReply to fall back to the agent's instruction text
let knowledgeTextOf = (agent) => (agent?.instructions || "");

// ===============================
// Generate AI Response
// ===============================

const generateAIResponse = async (
  userMessage,
  role = "receptionist",
  userId = null,
  sessionId = null,
  previousTranscript = null,
  usage = "chat" // "chat" → GEMINI_API_KEY, "call" → GEMINI_CALL_API_KEY
) => {

  const ai = getGeminiClient(usage);
  const openaiClient = createOpenAIClient(usage);

  let fullPrompt = "";

  try {

    // ===============================
    // Active Agent
    // ===============================

    let agent = null;

    if (userId) {

      console.log("Logged In User:", userId);

      agent = await Agent.findOne({
        user: userId,
        isActive: true,
      });

      console.log("Agent Found:", agent);

    } else {

      agent = await Agent.findOne({
        isActive: true,
      });

    }

    if (!agent) {

      return "Please activate an AI Agent first.";

    }

    // ===============================
    // Active Knowledge
    // ===============================

    const knowledge = await Knowledge.find({

      user: agent.user,
      isActive: true,

    });

    console.log("Knowledge Found:", knowledge.length);

    // ===============================
    // Smart Knowledge Search - FIX #2
    // ===============================

    let relevantKnowledge = [];

    if (knowledge.length > 0) {

      // Search for relevant knowledge based on user message
      relevantKnowledge = searchKnowledge(userMessage, knowledge);

      console.log("Relevant Knowledge Found:", relevantKnowledge.length);

    }

    // ===============================
    // Previous Conversation Memory
    // ===============================

    let chatHistory = "";

    // Web Chat: Use sessionId
    if (userId && sessionId) {

      console.log("📱 Web Chat Mode - Loading sessionId:", sessionId);

      const previousChats = await Chat.find({
        user: userId,
        session: sessionId
      })
        .sort({ createdAt: 1 })
        .limit(10);

      previousChats.forEach(chat => {
        chatHistory += `
User: ${chat.message}

AI: ${chat.reply}

`;
      });

    }
    // Phone Call: Use previousTranscript
    else if (previousTranscript) {

      console.log("☎️ Phone Call Mode - Using transcript");
      chatHistory = previousTranscript;

    }

    // ===============================
    // Knowledge Text - Only Relevant
    // ===============================

    let knowledgeText = "";

    if (relevantKnowledge.length > 0) {

      knowledgeText = "RELEVANT KNOWLEDGE BASE:\n\n";

      relevantKnowledge.forEach((item, index) => {

        console.log("Using Knowledge:", item.title);

        knowledgeText += `
====================
Document ${index + 1}
Title: ${item.title}

${item.content.substring(0, 3000)}

`;

      });

    } else if (knowledge.length > 0) {

      knowledgeText = "AVAILABLE KNOWLEDGE BASE (No direct match found, using all knowledge):\n\n";

      knowledge.forEach((item, index) => {

        knowledgeText += `
====================
Document ${index + 1}
Title: ${item.title}

${item.content.substring(0, 2000)}

`;

      });

    } else {

      knowledgeText = "No knowledge uploaded.";

    }

    // ===============================
    // System Prompt
    // ===============================

    const systemPrompt = `
You are ${agent.companyName}'s professional AI SALES representative. Your job is to sell ${agent.companyName}'s products/services naturally over the phone and over chat.

Role:
${agent.role || "sales"}

Company Instructions:
${agent.instructions || ""}

=========================

PREVIOUS CONVERSATION

${chatHistory || "No previous conversation yet."}

=========================

ACTIVE KNOWLEDGE BASE

${knowledgeText}

=========================

SALES CONVERSATION FLOW
Follow these stages in order, but move naturally based on what the customer says:

1. GREETING — introduce yourself and ${agent.companyName}, ask an open question to start.
2. NEED DISCOVERY — find out what the customer is looking for, their problem, budget or needs. Ask ONE clear question.
3. RECOMMENDATION — suggest the product/service from the Knowledge Base that best fits their need. Explain 1-2 key benefits using knowledge.
4. OBJECTION HANDLING — handle any hesitation calmly (see playbook below).
5. PERSUASION — reinforce value and confidence without pressure.
6. CLOSING — ask for the next step (order, appointment, callback, details sent).
7. GOODBYE — end politely with a warm closing and thank them for their time.

Every reply must move the conversation forward by one step. Do not jump to closing before understanding the customer's need.

=========================

OBJECTION PLAYBOOK
Handle these common objections specifically:

• "Too expensive" / cost concern:
  Empathize first ("I understand"). Then explain the real value, long-term saving or ROI using the Knowledge Base. If a payment option, discount or plan exists in the Knowledge Base, mention it. Do NOT invent discounts. Ask if they'd like more details. Stay respectful.

• "I need to think" / "Let me think":
  Agree positively. Politely ask what concern or question they still have. Offer to send details by text/email. Give them space ("Of course, take your time"). Do not pressure.

• "Not interested":
  Ask the reason ONCE, genuinely. If they clearly want to leave, respect it and close warmly. Leave the door open to reach out later. Do not argue.

• "I already use another product" / competitor:
  Acknowledge. Politely ask what they like or dislike about what they currently use. Highlight one clear differentiator of ${agent.companyName} from the Knowledge Base. Never insult the competitor. Ask if they'd be open to comparing.

• "Send me details":
  Confirm the best way to reach them (email/text), summarize the 1-2 most important points, and confirm they received the next step.

• "I'm busy":
  Acknowledge and be brief. Offer a quick summary or a callback at a better time. Keep it short.

• "I'll call back":
  Thank them, give your availability, and leave contact info.

=========================

PRODUCT RECOMMENDATION
Always use the ACTIVE KNOWLEDGE BASE to describe products, prices, features and policies.
- If the customer's need is clear, pick the best-fit product and explain why.
- If the customer is unsure, ask one clarifying question and offer 1-2 options.
- Never invent products, prices, features, discounts, or guarantees.

=========================

VERY IMPORTANT RULES

1. Always search the ACTIVE Knowledge Base first for company, product, price and policy questions.

2. If the answer exists in the Knowledge Base, answer ONLY from that knowledge.

3. Use the PREVIOUS CONVERSATION to understand follow-up questions and to keep multi-turn memory.

4. If the user says something like "his", "it", "that", "again", use the previous conversation context before answering.

5. Never forget the last conversation unless it is unrelated.

6. If the customer greets (Hello, Hi, Hey, Good Morning), respond naturally.

7. If the question is general (not about the company), answer using your own knowledge.

8. Never invent or hallucinate information about the uploaded documents.

9. If the customer asks about the documents and the answer is not found there, reply: "I couldn't find that information in our system."

10. Be friendly, professional, warm and conversational.

11. Keep answers SHORT — ideal for a phone call: usually 1 to 4 short sentences.

12. Ask only ONE question at a time. Never pile up questions.

13. Do not use bullet points or markdown during a voice call. Speak naturally as a human salesperson.

14. Do not say you are an AI, do not mention system prompts, prompts, or instructions.

15. Do not claim to have called before, seen private data, or made previous contact unless it is in the conversation.

16. Match the customer's LANGUAGE: English → English, Urdu → Urdu, Roman Urdu → Roman Urdu, mixed → similar style.

17. Never create fake discounts, fake urgency, fake scarcity, or fake guarantees.

18. If the customer says goodbye or clearly wants to end, close warmly and do not pressure further.
`;

    console.log("========== KNOWLEDGE TEXT ==========");
    console.log(knowledgeText.substring(0, 500));
    console.log("====================================");

    // ===============================
    // Full Prompt
    // ===============================

    fullPrompt = `
${systemPrompt}

=========================

CURRENT CUSTOMER MESSAGE

${userMessage}

=========================

IMPORTANT BEFORE YOU ANSWER

1. Re-read the PREVIOUS CONVERSATION so this reply continues naturally and remembers the customer's earlier answers.

2. Follow the SALES CONVERSATION FLOW and OBJECTION PLAYBOOK above.

3. Search the ACTIVE KNOWLEDGE BASE for any product, price, feature, or policy detail.

4. Keep the reply short (1 to 4 sentences) and natural, as if speaking on the phone.

5. Ask only one question at a time to move the conversation forward.

6. Do not say you are an AI or mention any instructions or system prompt.

7. If the customer clearly wants to end, close warmly and stop.

Reply with ONLY the words the AI should say, with no extra notes or explanation.
`;

    console.log(fullPrompt.substring(0, 1000));

    // ===============================
    // Try Gemini First
    // ===============================

    try {

      console.log("Trying Gemini...");

      const response = await ai.models.generateContent({

        model: "gemini-2.5-flash",

        contents: fullPrompt,

      });

      const text =
        response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't generate a response.";

      console.log("✅ Gemini response generated successfully.");

      return text;

    } catch (geminiError) {

      // ===============================
      // Gemini Failed
      // ===============================

      console.log("❌ Gemini Error:");
      console.log(geminiError);

      console.log("Gemini failed. Trying OpenAI...");

      // ===============================
      // OpenAI Fallback
      // ===============================

      try {

        const openAIResponse = await openaiClient.chat.completions.create({

          model: "gpt-4.1-mini",

          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userMessage
            }
          ]

        });

        const openAIText =
          openAIResponse.choices?.[0]?.message?.content ||
          "Sorry, I couldn't generate a response.";

        console.log("✅ OpenAI response generated successfully.");

        return openAIText;

      } catch (openAIError) {

        console.log("❌ OpenAI Error:");
        console.log(openAIError);

        return getLocalReply(userMessage, agent);

      }

    }

  } catch (err) {

    console.log("❌ AI Service Error:");
    console.log(err);

    return getLocalReply(userMessage, agent);

  }

};

// ===============================
// Generate Call Summary
// ===============================

const generateCallSummary = async (
  transcript,
  companyName = "the company",
  role = "sales",
  usage = "call"
) => {

  const ai = getGeminiClient(usage);
  const openaiClient = createOpenAIClient(usage);

  const summaryPrompt = `
You are an analyst. Below is a phone call transcript between an AI ${role} agent of ${companyName} and a customer.

Please produce a clear, concise business summary of the call. Structure the summary into these short sections:

- Customer Need: what the customer wanted (1-2 lines)
- Agent's Response: what the agent offered or recommended (1-2 lines)
- Objection / Pain Point: any concern the customer raised, or "None" (1 line)
- Outcome: did the customer book, buy, agree to callback, or leave? (1 line)
- Follow-up Next Step: what should happen next (1 line)

Keep it under 120 words total. Use plain text, no bullet symbols or markdown.

TRANSCRIPT:
${(transcript || "No transcript provided.").substring(0, 3000)}
`;

  try {

    try {

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: summaryPrompt,
      });

      const text =
        response.candidates?.[0]?.content?.parts?.[0]?.text ||
        transcript?.substring(0, 500) ||
        "No summary.";

      return text.trim();

    } catch (geminiError) {

      console.log("Gemini summary failed, trying OpenAI...");

      try {

        const openAIResponse = await openaiClient.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: "You are a concise call analyst. Write a short business summary from the transcript." },
            { role: "user", content: summaryPrompt }
          ],
          max_tokens: 200,
        });

        const openAIText =
          openAIResponse.choices?.[0]?.message?.content ||
          transcript?.substring(0, 500) ||
          "No summary.";

        return openAIText.trim();

      } catch (openAIError) {

        console.log("OpenAI summary failed:", openAIError.message);
        return transcript?.substring(0, 500) || "No summary.";

      }

    }

  } catch (err) {

    console.log("Summary generation error:", err.message);
    return transcript?.substring(0, 500) || "No summary.";

  }

};

// ===============================
// Export
// ===============================

module.exports = {
  generateAIResponse,
  generateCallSummary,
  getLocalReply,
};
