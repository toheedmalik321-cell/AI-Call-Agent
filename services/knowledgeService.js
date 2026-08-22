const Knowledge = require("../models/knowledge");

const searchKnowledge = async (question, userId) => {

    const files = await Knowledge.find({
    user: userId,
    isActive: true
});

    if (files.length === 0) {
        return "";
    }

    const words = question.toLowerCase().split(" ");

    let bestContent = "";
    let highestScore = 0;

    files.forEach(file => {

        let score = 0;

        const text = file.content.toLowerCase();

        words.forEach(word => {

            if (text.includes(word)) {
                score++;
            }

        });

        if (score > highestScore) {

            highestScore = score;

            bestContent = file.content;

        }

    });

    return bestContent;

};

module.exports = {
    searchKnowledge
};