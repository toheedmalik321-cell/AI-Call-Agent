const User = require("../models/user");
const Call = require("../models/call");
const Chat = require("../models/chat");
const Agent = require("../models/agent");
const Knowledge = require("../models/knowledge");

// ===============================
// Dashboard
// ===============================

const getDashboard = async (req, res) => {

    try {

        // ===========================
        // Summary
        // ===========================

        const totalUsers = await User.countDocuments();

        const totalCalls = await Call.countDocuments({
            user: req.user.id
        });

        const totalChats = await Chat.countDocuments({
            user: req.user.id
        });

        const totalAgents = await Agent.countDocuments({
            user: req.user.id
        });

        const totalKnowledge = await Knowledge.countDocuments({
            user: req.user.id
        });

        // ===========================
        // Recent Calls
        // ===========================

        const recentCalls = await Call.find({

            user: req.user.id

        })

        .select("customerName status createdAt")

        .sort({

            createdAt: -1

        })

        .limit(5);

        // ===========================
        // Recent Chats
        // ===========================

        const recentChats = await Chat.find({

            user: req.user.id

        })

        .select("message createdAt")

        .sort({

            createdAt: -1

        })

        .limit(5);

        // ===========================
        // Recent Agents
        // ===========================

        const recentAgents = await Agent.find({

            user: req.user.id

        })

        .select("companyName role isActive")

        .sort({

            createdAt: -1

        })

        .limit(5);

        // ===========================
        // Recent Knowledge
        // ===========================

        const recentKnowledge = await Knowledge.find({

            user: req.user.id

        })

        .select("title createdAt")

        .sort({

            createdAt: -1

        })

        .limit(5);

        // ===========================
// Today's Calls
// ===========================

const today = new Date();

today.setHours(0, 0, 0, 0);

const todayCalls = await Call.countDocuments({

    user: req.user.id,

    createdAt: {

        $gte: today

    }

});

// ===========================
// Today's Chats
// ===========================

const todayChats = await Chat.countDocuments({

    user: req.user.id,

    createdAt: {

        $gte: today

    }

});

// ===========================
// Average Call Duration
// ===========================

const durationResult = await Call.aggregate([
{
    $match: {
    user: req.user.id
        }

    },

    {

        $group: {

            _id: null,

            avgDuration: {

                $avg: "$duration"

            }

        }

    }

]);

const averageDuration =

durationResult.length > 0

? Math.round(durationResult[0].avgDuration)

: 0;



      // ===========================
// Response
// ===========================

res.status(200).json({

    success: true,

    data: {

        totalUsers,

        totalCalls,

        totalChats,

        totalAgents,

        totalKnowledge,

        todayCalls,

        todayChats,

        averageDuration,

        recentCalls,

        recentChats,

        recentAgents,

        recentKnowledge

    }

});

} catch (err) {

    console.log(err);

    res.status(500).json({
        success: false,
        message: err.message
    });

}

};
module.exports = {

    getDashboard

};