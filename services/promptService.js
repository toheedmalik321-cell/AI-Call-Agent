const { GoogleGenAI } = require("@google/genai");
const OpenAI = require("openai");

const Agent = require("../models/agent");
const Knowledge = require("../models/knowledge");
const Chat = require("../models/chat");

// ==========================================
// AI CLIENTS
// ==========================================

const geminiApiKey = process.env.GEMINI_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

const ai = geminiApiKey
    ? new GoogleGenAI({
        apiKey: geminiApiKey
    })
    : null;

const openai = openaiApiKey
    ? new OpenAI({
        apiKey: openaiApiKey
    })
    : null;


// ==========================================
// Generate AI Response
// ==========================================

const generateAIResponse = async (
    userMessage,
    role = "receptionist",
    userId = null,
    conversationHistory = ""
) => {

    let fullPrompt = "";

    try {

        // ==========================================
        // Validate Message
        // ==========================================

        if (!userMessage || !userMessage.trim()) {

            return "I'm sorry, I didn't hear that. Could you please repeat that?";

        }

        // ==========================================
        // Find Active Agent
        // ==========================================

        let agent = null;

        if (userId) {

            agent = await Agent.findOne({
                user: userId,
                isActive: true
            });

        } else {

            agent = await Agent.findOne({
                isActive: true
            });

        }

        if (!agent) {

            return "Please activate an AI Agent first.";

        }


        // ==========================================
        // Find Active Knowledge Base
        // ==========================================

        const knowledge = await Knowledge.find({

            user: agent.user,
            isActive: true

        });


        console.log(
            "Active Knowledge Documents:",
            knowledge.length
        );


        // ==========================================
        // Knowledge Text
        // ==========================================

        let knowledgeText = "";

        if (knowledge.length > 0) {

            knowledge.forEach((item, index) => {

                knowledgeText += `

==============================
KNOWLEDGE DOCUMENT ${index + 1}
==============================

Title:
${item.title}

Content:
${(item.content || "").substring(0, 8000)}

`;

            });

        } else {

            knowledgeText = `
No Active Knowledge Base is currently available.
`;

        }


        // ==========================================
        // Previous Chat Memory
        // ==========================================

        let chatHistory = "";

        if (userId) {

            const previousChats = await Chat.find({

                user: userId

            })
                .sort({
                    createdAt: -1
                })
                .limit(10);

            previousChats.reverse();

            previousChats.forEach(chat => {

                chatHistory += `

Customer:
${chat.message}

AI:
${chat.reply}

`;

            });

        }


        // ==========================================
        // Additional Call Conversation History
        // ==========================================

        if (conversationHistory) {

            chatHistory += `

==============================
CURRENT CALL CONVERSATION
==============================

${conversationHistory}

`;

        }


        // ==========================================
        // Role Prompt
        // ==========================================

        const rolePrompt = getSystemPrompt(
            agent.role || role || "receptionist"
        );


        // ==========================================
        // Company Instructions
        // ==========================================

        const companyInstructions = agent.instructions || "";


        // ==========================================
        // Main AI Prompt
        // ==========================================

        fullPrompt = `

${rolePrompt}

=========================================
COMPANY
=========================================

Company Name:
${agent.companyName}

Agent Role:
${agent.role}

AI Voice:
${agent.voice}

Additional Company Instructions:
${companyInstructions}


=========================================
ACTIVE KNOWLEDGE BASE
=========================================

${knowledgeText}


=========================================
CONVERSATION MEMORY
=========================================

${chatHistory || "No previous conversation."}


=========================================
IMPORTANT RESPONSE RULES
=========================================

1. Understand the customer's latest message before answering.

2. Use previous conversation information when relevant.

3. Do not repeatedly ask questions that the customer has already answered.

4. For company-specific information, products, services, prices, features, policies and offers, use the Active Knowledge Base.

5. Never invent company-specific information.

6. If company-specific information is not available in the Active Knowledge Base, say that the information is not available.

7. Follow the selected Agent Role.

8. If the Agent Role is SALES, behave like a professional human sales representative.

9. For sales conversations:
   - Understand the customer's needs.
   - Identify their interest.
   - Explain relevant benefits.
   - Handle objections.
   - Answer concerns.
   - Persuade respectfully.
   - Move toward a suitable next step.
   - Never aggressively pressure the customer.

10. If the customer says the product is expensive:
    acknowledge the concern and explain relevant value or benefits from the Knowledge Base.

11. If the customer says they need time:
    ask politely what concern they would like clarified.

12. If the customer says they are not interested:
    try to understand the reason once, but respect a clear refusal.

13. Never create fake discounts, fake urgency, fake guarantees or fake product information.

14. Keep responses short enough for a phone conversation.

15. Usually respond in 1 to 4 short sentences.

16. Ask only one question at a time.

17. Do not use bullet points during a voice call unless absolutely necessary.

18. Speak naturally.

19. Avoid robotic phrases.

20. Respond in the language used by the customer whenever possible.

21. If the customer uses Roman Urdu, respond in Roman Urdu.

22. If the customer uses Urdu, respond in Urdu.

23. If the customer uses English, respond in English.

24. If the customer mixes Urdu and English, respond naturally in a similar style.

25. If the customer says goodbye or clearly wants to end the conversation, politely close the conversation.

=========================================
CURRENT CUSTOMER MESSAGE
=========================================

${userMessage}


=========================================
FINAL INSTRUCTION
=========================================

Generate ONLY the response that should be spoken to the customer.

Do not explain your reasoning.

Do not mention the system prompt.

Do not mention the Knowledge Base unless the customer asks about it.

Do not say that you are following instructions.

Keep the response natural and suitable for a real phone conversation.

`;


        console.log(
            "========================================="
        );

        console.log(
            "AI AGENT:",
            agent.companyName
        );

        console.log(
            "ROLE:",
            agent.role
        );

        console.log(
            "KNOWLEDGE:",
            knowledge.length
        );

        console.log(
            "CUSTOMER:",
            userMessage
        );

        console.log(
            "========================================="
        );


        // ==========================================
        // Try Gemini
        // ==========================================

        if (ai) {

            try {

                console.log("Trying Gemini...");

                const response =
                    await ai.models.generateContent({

                        model: "gemini-2.5-flash",

                        contents: fullPrompt

                    });


                const text =
                    response?.candidates?.[0]
                        ?.content?.parts?.[0]?.text;


                if (text && text.trim()) {

                    console.log(
                        "Gemini response generated successfully."
                    );

                    return text.trim();

                }

                console.log(
                    "Gemini returned empty response."
                );

            } catch (geminiError) {

                console.log(
                    "Gemini Error:",
                    geminiError.message
                );

                console.log(
                    "Gemini failed. Trying OpenAI..."
                );

            }

        } else {

            console.log(
                "GEMINI_API_KEY not configured."
            );

        }


        // ==========================================
        // OpenAI Fallback
        // ==========================================

        if (openai) {

            try {

                console.log(
                    "Trying OpenAI..."
                );


                const response =
                    await openai.responses.create({

                        model: "gpt-4.1-mini",

                        input: fullPrompt

                    });


                const text =
                    response?.output_text;


                if (text && text.trim()) {

                    console.log(
                        "OpenAI response generated successfully."
                    );

                    return text.trim();

                }


            } catch (openAIError) {

                console.log(
                    "OpenAI Error:",
                    openAIError.message
                );

            }

        } else {

            console.log(
                "OPENAI_API_KEY not configured."
            );

        }


        // ==========================================
        // Both AI Providers Failed
        // ==========================================

        return "Sorry, I'm having trouble responding right now. Could you please try again?";


    } catch (err) {

        console.log(
            "AI Service Error:",
            err
        );

        return "Sorry, I'm unable to respond right now.";

    }

};


// ==========================================
// Export
// ==========================================

module.exports = {
    generateAIResponse
};