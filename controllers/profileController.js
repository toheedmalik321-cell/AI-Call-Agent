const bcrypt = require("bcryptjs");
const User = require("../models/user");

// ===============================
// Get Profile
// ===============================

const getProfile = async (req, res) => {

    try {

        const user = await User.findById(req.user.id).select("-password");

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        }

        res.json({
            success: true,
            data: user
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};

// ===============================
// Update Profile
// ===============================

const updateProfile = async (req, res) => {

    try {

        const user = await User.findByIdAndUpdate(

            req.user.id,

            req.body,

            {
                new: true
            }

        ).select("-password");

        res.json({

            success: true,

            message: "Profile Updated Successfully",

            data: user

        });

    } catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};
const changePassword = async (req, res) => {

    try {

        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id);

        const match = await bcrypt.compare(currentPassword, user.password);

        if (!match) {

            return res.status(400).json({

                success: false,

                message: "Current Password is Incorrect"

            });

        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;

        await user.save();

        res.json({

            success: true,

            message: "Password Changed Successfully"

        });

    } catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

module.exports = {

    getProfile,

    updateProfile,

    changePassword

};