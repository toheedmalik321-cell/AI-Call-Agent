const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema(
{
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    companyName: {
        type: String,
        required: true,
    },

    role: {
        type: String,
        default: "receptionist",
    },

    instructions: {
        type: String,
        default: "",
    },

    // ==========================
    // AI Voice
    // ==========================

    voice: {
        type: String,
        default: "alice"
    },

    isActive: {
        type: Boolean,
        default: false,
    }

},
{
    timestamps: true,
});

module.exports = mongoose.model("Agent", agentSchema);