const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }

});

const fileFilter = (req, file, cb) => {

    const allowedTypes = [

        "application/pdf",

        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        "text/plain"

    ];

    if (allowedTypes.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(new Error("Only PDF, DOCX and TXT files are allowed."), false);

    }

};

const upload = multer({

    storage,

    fileFilter,

    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }

});

module.exports = upload;