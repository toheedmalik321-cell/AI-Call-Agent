const Chat = require("../models/chat");
const ChatSession = require("../models/chatSession");
const Knowledge = require("../models/knowledge");
const { generateAIResponse } = require("../services/aiService");

// ======================================
// Chat With AI - FIX #1: Pass sessionId
// ======================================

const chatWithAI = async (req, res) => {

    try {

        const {
            message,
            role,
            sessionId
        } = req.body;

        if (!sessionId) {

            return res.status(400).json({
                success: false,
                message: "Session ID is required"
            });

        }

        // Check Session

        const session = await ChatSession.findOne({

            _id: sessionId,
            user: req.user.id

        });

        if (!session) {

            return res.status(404).json({
                success: false,
                message: "Chat Session not found"
            });

        }

        // AI Reply - FIX: Pass sessionId as 4th parameter
        const reply = await generateAIResponse(

            message,
            role || "receptionist",
            req.user.id,
            sessionId  // ← SESSION ID FOR WEB CHAT

        );

        // Save Message

        await Chat.create({

            user: req.user.id,

            session: sessionId,

            message,

            reply

        });

        // First message becomes title

        const totalMessages = await Chat.countDocuments({

            session: sessionId

        });

        if (totalMessages === 1) {

            session.title = message.substring(0, 40);

            await session.save();

        }

        res.status(200).json({

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

// ======================================
// Create New Chat Session
// ======================================

const createChatSession = async (req, res) => {

    try {

        const session = await ChatSession.create({

            user: req.user.id,

            title: "New Chat"

        });

        res.status(201).json({

            success: true,

            data: session

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// ======================================
// Get All Chat Sessions
// ======================================

const getChatSessions = async (req, res) => {

    try {

        const sessions = await ChatSession.find({

            user: req.user.id

        }).sort({

            updatedAt: -1

        });

        res.status(200).json({

            success: true,

            totalSessions: sessions.length,

            data: sessions

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// ======================================
// Get Single Chat History
// ======================================

const getSingleChatHistory = async (req, res) => {

    try {

        const chats = await Chat.find({

            user: req.user.id,

            session: req.params.sessionId

        }).sort({

            createdAt: 1

        });

        res.status(200).json({

            success: true,

            totalChats: chats.length,

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

// ======================================
// Get Latest Chat History (Old API)
// ======================================

const getChatHistory = async (req, res) => {

    try {

        const chats = await Chat.find({

            user: req.user.id

        }).sort({

            createdAt: -1

        });

        res.status(200).json({

            success: true,

            totalChats: chats.length,

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

// ======================================
// Delete Chat Message
// ======================================

const deleteChat = async (req, res) => {

    try {

        const chat = await Chat.findOneAndDelete({

            _id: req.params.id,

            user: req.user.id

        });

        if (!chat) {

            return res.status(404).json({

                success: false,

                message: "Chat not found"

            });

        }

        res.status(200).json({

            success: true,

            message: "Chat Deleted Successfully!"

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// ======================================
// Delete Chat Session
// ======================================

const deleteChatSession = async (req, res) => {

    try {

        const session = await ChatSession.findOne({

            _id: req.params.sessionId,
            user: req.user.id

        });

        if (!session) {

            return res.status(404).json({

                success: false,
                message: "Session not found"

            });

        }

        // Delete all messages

        await Chat.deleteMany({

            session: req.params.sessionId

        });

        // Delete session

        await ChatSession.deleteOne({

            _id: req.params.sessionId

        });

        res.status(200).json({

            success: true,
            message: "Chat Session Deleted Successfully!"

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};

// ======================================
// Exports
// ======================================

module.exports = {

    chatWithAI,

    createChatSession,

    getChatSessions,

    getSingleChatHistory,

    getChatHistory,

    deleteChat,

    deleteChatSession

};