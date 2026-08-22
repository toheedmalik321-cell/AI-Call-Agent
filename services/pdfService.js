const fs = require("fs");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");

// ==============================
// Extract Text From Uploaded File
// Supports PDF, DOCX and TXT
// ==============================

const extractText = async (filePath, mimetype) => {

    try {

        // ==========================
        // PDF
        // ==========================

        if (mimetype === "application/pdf") {

            const buffer = fs.readFileSync(filePath);

            const data = await pdf(buffer);

            return data.text;

        }

        // ==========================
        // DOCX
        // ==========================

        if (
            mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {

            const result = await mammoth.extractRawText({
                path: filePath,
            });

            return result.value;

        }

        // ==========================
        // TXT
        // ==========================

        if (mimetype === "text/plain") {

            return fs.readFileSync(filePath, "utf8");

        }

        throw new Error("Unsupported file type.");

    } catch (err) {

        console.log(err);

        throw err;

    }

};

module.exports = {
    extractText,
};