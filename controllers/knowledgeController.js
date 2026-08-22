const Knowledge = require("../models/knowledge");
const { extractText } = require("../services/pdfService");

// ==============================
// Upload PDF
// ==============================

const uploadKnowledge = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF",
      });
    }

    const fileText = await extractText(
    req.file.path,
    req.file.mimetype
);

    // Purani active PDF inactive karo
    await Knowledge.updateMany(
      { user: req.user.id },
      { isActive: false }
    );

    // Nayi PDF active hogi
    const knowledge = await Knowledge.create({
      user: req.user.id,
      title: req.body.title,
      fileName: req.file.filename,
      filePath: req.file.path,
      content: fileText,
      isActive: true,
    });

    console.log("========== PDF TEXT ==========");
    console.log(fileText.substring(0, 1000));
    console.log("==============================");

    res.status(201).json({
      success: true,
      message: "Knowledge Uploaded Successfully!",
      data: knowledge,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==============================
// Get All Knowledge
// ==============================

const getKnowledge = async (req, res) => {
  try {
    const knowledge = await Knowledge.find({
      user: req.user.id,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      totalFiles: knowledge.length,
      data: knowledge,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==============================
// Delete Knowledge
// ==============================

const deleteKnowledge = async (req, res) => {

    try {

        const knowledge = await Knowledge.findOne({
            _id: req.params.id,
            user: req.user.id,
        });

        if (!knowledge) {

            return res.status(404).json({
                success: false,
                message: "Knowledge not found",
            });

        }

        const wasActive = knowledge.isActive;

        await knowledge.deleteOne();

        if (wasActive) {

            const latest = await Knowledge.findOne({
                user: req.user.id
            }).sort({ createdAt: -1 });

            if (latest) {

                latest.isActive = true;

                await latest.save();

            }

        }

        res.status(200).json({
            success: true,
            message: "Knowledge Deleted Successfully!",
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message,
        });

    }

};

// ==============================
// Make Active Knowledge
// ==============================

const makeActiveKnowledge = async (req, res) => {

    try {

        const knowledge = await Knowledge.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!knowledge) {

            return res.status(404).json({
                success: false,
                message: "Knowledge not found"
            });

        }

        // Sab inactive
        await Knowledge.updateMany(
            { user: req.user.id },
            { isActive: false }
        );

        // Sirf selected active
        knowledge.isActive = true;

        await knowledge.save();

        res.status(200).json({
            success: true,
            message: "Knowledge Activated Successfully!"
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};

module.exports = {
  uploadKnowledge,
  getKnowledge,
  deleteKnowledge,
  makeActiveKnowledge,
};