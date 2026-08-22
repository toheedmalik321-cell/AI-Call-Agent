const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {

    try {

        const authHeader = req.header("Authorization");
        console.log("AUTH HEADER:", authHeader);

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "No Token"
            });
        }

        const token = authHeader.startsWith("Bearer ")
            ? authHeader.replace("Bearer ", "")
            : authHeader;

        console.log("TOKEN:", token);
        console.log("JWT_SECRET:", process.env.JWT_SECRET);

        const verified = jwt.verify(token, process.env.JWT_SECRET);

        console.log("VERIFIED:", verified);

        req.user = verified;

        next();

    } catch (err) {

        console.log("JWT Error:", err.message);

        return res.status(401).json({
            success: false,
            message: "Invalid Token"
        });

    }

};

module.exports = auth;