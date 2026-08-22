const Agent = require("../models/agent");

// ===============================
// Create Agent
// ===============================

const createAgent = async (req, res) => {

    try {

        const totalAgents = await Agent.countDocuments({
            user: req.user.id
        });

        const agent = await Agent.create({

    user: req.user.id,

    companyName: req.body.companyName,

    role: req.body.role,

    instructions: req.body.instructions,

    voice: req.body.voice || "alice",

    isActive: totalAgents === 0

});
        res.status(201).json({

            success: true,

            message: "Agent Created Successfully!",

            data: agent

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// ===============================
// Get All Agents
// ===============================

const getAgents = async (req, res) => {

    try {

        const agents = await Agent.find({

            user: req.user.id

        }).sort({

            createdAt: -1

        });

        res.status(200).json({

            success: true,

            totalAgents: agents.length,

            data: agents

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// ===============================
// Update Agent
// ===============================

const updateAgent = async (req, res) => {

    try {

        const agent = await Agent.findOneAndUpdate(

            {

                _id: req.params.id,

                user: req.user.id

            },

            {

                companyName: req.body.companyName,

                role: req.body.role,

                instructions: req.body.instructions

            },

            {

                new: true

            }

        );

        if (!agent) {

            return res.status(404).json({

                success: false,

                message: "Agent not found"

            });

        }

        res.status(200).json({

            success: true,

            message: "Agent Updated Successfully!",

            data: agent

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};
// ===============================
// Get Single Agent
// ===============================

const getSingleAgent = async (req, res) => {

    try {

        const agent = await Agent.findOne({

            _id: req.params.id,

            user: req.user.id

        });

        if (!agent) {

            return res.status(404).json({

                success: false,

                message: "Agent not found"

            });

        }

        res.json({

            success: true,

            data: agent

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};
// ===============================
// Delete Agent
// ===============================

const deleteAgent = async (req, res) => {

    try {

        const agent = await Agent.findOneAndDelete({

            _id: req.params.id,

            user: req.user.id

        });

        if (!agent) {

            return res.status(404).json({

                success: false,

                message: "Agent not found"

            });

        }

        const active = await Agent.findOne({

            user: req.user.id,

            isActive: true

        });

        if (!active) {

            const firstAgent = await Agent.findOne({

                user: req.user.id

            });

            if (firstAgent) {

                firstAgent.isActive = true;

                await firstAgent.save();

            }

        }

        res.status(200).json({

            success: true,

            message: "Agent Deleted Successfully!"

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// ===============================
// Set Active Agent
// ===============================

const setActiveAgent = async (req, res) => {

    try {

        await Agent.updateMany(

            {

                user: req.user.id

            },

            {

                isActive: false

            }

        );

        const agent = await Agent.findOneAndUpdate(

            {

                _id: req.params.id,

                user: req.user.id

            },

            {

                isActive: true

            },

            {

                new: true

            }

        );

        if (!agent) {

            return res.status(404).json({

                success: false,

                message: "Agent not found"

            });

        }

        res.status(200).json({

            success: true,

            message: "Active Agent Updated Successfully!",

            data: agent

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

    createAgent,

    getAgents,

    getSingleAgent,

    updateAgent,

    deleteAgent,

    setActiveAgent

};