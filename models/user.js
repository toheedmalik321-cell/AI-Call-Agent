const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },
    resetPasswordToken: {
    type: String,
    default: ""
},

    resetPasswordExpire: {
    type: Date
},

    company: {
        type: String,
        default: ""
    },

    phone: {
        type: String,
        default: ""
    },

    profileImage: {
    type: String,
    default: ""
    },

    isVerified: {
    type: Boolean,
    default: false
    },

    verificationToken: {
    type: String,
    default: ""
    },

    // Subscription / Stripe billing
    plan: {
    type: String,
    enum: ["free", "pro", "enterprise"],
    default: "free"
    },

    subscriptionStatus: {
    type: String,
    enum: ["none", "trialing", "active", "past_due", "canceled", "unpaid", "incomplete"],
    default: "none"
    },

    stripeCustomerId: {
    type: String,
    default: ""
    },

    stripeSubscriptionId: {
    type: String,
    default: ""
    },

    stripeSessionId: {
    type: String,
    default: ""
    },

    // PayTabs (Pakistan-friendly hosted payment)
    paytabsCartId: {
    type: String,
    default: ""
    },

    paytabsTranRef: {
    type: String,
    default: ""
    },

    paytabsPlan: {
    type: String,
    default: ""
    },

    currentPeriodEnd: {
    type: Date
    }
   

},
{
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);