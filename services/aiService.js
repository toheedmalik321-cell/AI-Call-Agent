const { getSystemPrompt } = require("./promptService");
const { GoogleGenAI } = require("@google/genai");
const OpenAI = require("openai");

const Agent = require("../models/agent");
const Knowledge = require("../models/knowledge");
const Chat = require("../models/chat");

// ===============================
// AI Clients
// ===============================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
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
// Generate AI Response
// ===============================

const generateAIResponse = async (
  userMessage,
  role = "receptionist",
  userId = null,
  sessionId = null,
  previousTranscript = null
) => {

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
You are an AI assistant for ${agent.companyName}.

Role:
${agent.role}

Company Instructions:
${agent.instructions}

=========================

PREVIOUS CONVERSATION

${chatHistory}

=========================

ACTIVE KNOWLEDGE BASE

${knowledgeText}

=========================

VERY IMPORTANT RULES

1. Always search the ACTIVE Knowledge Base first.

2. If the answer exists in the uploaded Knowledge Base, answer ONLY from that knowledge.

3. Use the PREVIOUS CONVERSATION to understand follow-up questions.

4. If the user asks something like "his", "it", "that", "again", "what about him", use the previous conversation context before answering.

5. Never forget the last conversation unless it is unrelated.

6. If the question is a greeting (Hello, Hi, Hey, Good Morning, etc.), respond naturally.

7. If the user asks a general AI question that is NOT related to the uploaded Knowledge Base, answer using your own knowledge.

8. Never invent or hallucinate information about the uploaded documents.

9. If the user specifically asks about the uploaded documents and the answer is not found there, reply:

"I couldn't find that information in the uploaded knowledge."

10. Be friendly, professional and conversational.

11. Keep answers clear and concise.
`;

    console.log("========== KNOWLEDGE TEXT ==========");
    console.log(knowledgeText.substring(0, 500));
    console.log("====================================");

    // ===============================
    // Full Prompt
    // ===============================

    fullPrompt = `
${systemPrompt}

Question:

${userMessage}

Remember:

Search the uploaded Knowledge Base first.

If the user's question is about the uploaded documents, answer only from the Knowledge Base.

If the question is general (like greetings, programming, AI, math, etc.), answer normally using your own knowledge.

If the user asks about the uploaded documents but the answer does not exist there, reply:

"I couldn't find that information in the uploaded knowledge."
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

        const openAIResponse = await openai.chat.completions.create({

          model: "gpt-4-mini",

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

        return "Sorry, I am unable to answer right now.";

      }

    }

  } catch (err) {

    console.log("❌ AI Service Error:");
    console.log(err);

    return "Sorry, I am unable to answer right now.";

  }

};

// ===============================
// Export
// ===============================

module.exports = {
  generateAIResponse,
};
