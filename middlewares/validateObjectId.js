const mongoose = require("mongoose");

// ==============================
// Validate ObjectId route params
// Returns 400 instead of 500 on malformed :id values
// ==============================

const validateObjectId = (param = "id") => {
    return (req, res, next) => {
        const value = req.params[param];

        if (value && !mongoose.Types.ObjectId.isValid(value)) {
            return res.status(400).json({
                success: false,
                message: "Invalid " + param + " ID format"
            });
        }

        next();
    };
};

module.exports = validateObjectId;