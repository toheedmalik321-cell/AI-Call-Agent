const Agent = require("../models/agent");
const Knowledge = require("../models/knowledge");

// ===============================
// Starter Knowledge Base (auto-created with a new agent)
// ===============================

const STARTER_KB_TITLE = "TechLite Laptop Store — Products & Policies";

const STARTER_KB_CONTENT = `COMPANY OVERVIEW
We are TechLite Computer Store, based in Lahore, Pakistan. We sell laptops, computer accessories, and offer easy monthly installment plans.

WORKING HOURS
Monday to Saturday, 11 AM to 9 PM. Sunday closed.

DELIVERY
Free delivery within Lahore. Nationwide delivery across Pakistan with a small shipping fee.

WARRANTY AND RETURNS
Every laptop comes with free 1-year warranty. Customers get a 7-day return policy if the laptop is damaged on arrival.

INSTALLMENT PLAN
We offer easy 12-month installments with zero extra cost. Down payment: 10% of the laptop price. Verified customer required.

PRODUCTS:
Basic Laptop - $450 (12,000 PKR per month) with 8GB RAM and 256GB SSD. Ideal for browsing, documents and basic office work.
Pro Laptop - $750 (20,000 PKR per month) with 16GB RAM and 512GB SSD. Ideal for students, developers and multitasking.
Gaming Laptop - $1,200 (32,000 PKR per month) with dedicated GPU, 16GB RAM and 1TB SSD. Ideal for gaming and heavy workloads.

PRICE CONVERSION
Prices are in USD. We also accept PKR. Please share current exchange rate before confirming an order.

ORDER PROCESS
Customer provides full name, phone number and delivery address. We confirm the order by phone. Payment via cash on delivery, bank transfer, or card.

PAYMENT METHODS
Cash on Delivery, bank transfer, EasyPaisa, JazzCash, and Visa/Mastercard card payment.

RETURN POLICY
If a customer wants to return a laptop, they must contact us within 7 days. The laptop must be in original condition with all accessories.

CONTACT
Phone support available during working hours. Our team calls back within 2 hours.`;

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

        // Auto-create the starter knowledge base when requested
        if (req.body.starterKnowledge === true) {

            try {

                const existing = await Knowledge.findOne({
                    user: req.user.id,
                    title: STARTER_KB_TITLE
                });

                if (!existing) {

                    await Knowledge.create({
                        user: req.user.id,
                        title: STARTER_KB_TITLE,
                        fileName: "starter-knowledge.txt",
                        filePath: "",
                        content: STARTER_KB_CONTENT,
                        isActive: true
                    });

                }

            } catch (kbError) {

                console.log("Starter knowledge base error:", kbError.message);

            }

        }

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