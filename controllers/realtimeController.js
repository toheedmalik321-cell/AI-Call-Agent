const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const createRealtimeSession = async (req, res) => {
    try {

        // Latest supported way
        const session = await openai.beta.realtime.sessions.create({
            model: "gpt-4o-realtime-preview-2024-12-17",
            voice: "alloy",
            instructions: "You are a helpful AI voice assistant for AI CallHub."
        });

        res.json({
            success: true,
            data: session
        });

    } catch (err) {

        console.log("Realtime Error:", err.message);
        console.log("Full Error:", err);

        res.status(500).json({
            success: false,
            message: err.message || "Failed to create realtime session"
        });
    }
};

module.exports = {
    createRealtimeSession
};