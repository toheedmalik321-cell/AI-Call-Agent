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
   

},
{
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);