const Chat = require("../models/chat");
const { generateAIResponse } = require("../services/aiService");

// ===============================
// AI Chat
// ===============================

const aiChat = async (req, res) => {

    try {

        const { message } = req.body;

        const reply = await generateAIResponse(

            message,

            "receptionist",

            req.user.id

        );

        await Chat.create({

            user: req.user.id,

            message,

            reply

        });

        res.json({

            success: true,

            reply

        });

    }

    catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// ===============================
// Chat History
// ===============================

const getHistory = async (req, res) => {

    try {

        const chats = await Chat.find({

            user: req.user.id

        }).sort({

            createdAt: -1

        });

        res.json({

            success: true,

            data: chats

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

module.exports = {

    aiChat,

    getHistory

};