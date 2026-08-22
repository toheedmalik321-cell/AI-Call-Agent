
const Call = require("../models/call");
const Agent = require("../models/agent");
const { generateAIResponse } = require("../services/aiService");

// ===================================
// Create AI Call
// ===================================

const createCall = async (req, res) => {

    try {

        const {
            customerName,
            phoneNumber,
            customerMessage
        } = req.body;

        // Active Agent
        const agent = await Agent.findOne({
            user: req.user.id,
            isActive: true
        });

        if (!agent) {

            return res.status(404).json({
                success: false,
                message: "No Active Agent Found"
            });

        }

        // Call Start Time
        const startTime = new Date();

        // AI Reply
        const aiReply = await generateAIResponse(
    customerMessage,
    agent.role,
    req.user.id
);

        // Call End Time
        const endTime = new Date();

        // Duration (Seconds)
        const duration = Math.floor(
            (endTime - startTime) / 1000
        );

        // Transcript
        const transcript = `

Customer:
${customerMessage}

AI:
${aiReply}

`;

        // Summary
        const callSummary =
            customerMessage.length > 150
                ? customerMessage.substring(0, 150) + "..."
                : customerMessage;

        // Save
       const call = await Call.create({

    user: req.user.id,

    agent: agent._id,

    customerName,

    phoneNumber,

    customerMessage,

    aiReply,

    transcript,

    callSummary,

    status: "completed",

    duration,

    startedAt: startTime,

    endedAt: endTime

});

res.status(201).json({

    success: true,

    message: "AI Call Completed Successfully!",

    data: call

});
    }

    catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};
// ===================================
// Get All Calls
// ===================================

const getCalls = async (req, res) => {

    try {

        const calls = await Call.find({

            user: req.user.id

        })

        .populate("agent", "companyName role")

        .sort({

            createdAt: -1

        });

        res.status(200).json({

            success: true,

            totalCalls: calls.length,

            data: calls

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// ===================================
// Get Single Call
// ===================================

const getCallById = async (req, res) => {

    try {

        const call = await Call.findOne({

            _id: req.params.id,

            user: req.user.id

        })

        .populate("agent", "companyName role");

        if (!call) {

            return res.status(404).json({

                success: false,

                message: "Call not found"

            });

        }

        res.status(200).json({

            success: true,

            data: call

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// ===================================
// Update Call
// ===================================

const updateCall = async (req, res) => {

    try {

        const call = await Call.findOneAndUpdate(

            {

                _id: req.params.id,

                user: req.user.id

            },

            req.body,

            {

                new: true

            }

        );

        if (!call) {

            return res.status(404).json({

                success: false,

                message: "Call not found"

            });

        }

        res.status(200).json({

            success: true,

            message: "Call Updated Successfully!",

            data: call

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// ===================================
// Delete Call
// ===================================

const deleteCall = async (req, res) => {

    try {

        const call = await Call.findOneAndDelete({

            _id: req.params.id,

            user: req.user.id

        });

        if (!call) {

            return res.status(404).json({

                success: false,

                message: "Call not found"

            });

        }

        res.status(200).json({

            success: true,

            message: "Call Deleted Successfully!"

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

    createCall,

    getCalls,

    getCallById,

    updateCall,

    deleteCall

};