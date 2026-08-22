const twilio = require("twilio");

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const makeCall = async (to) => {

    const call = await client.calls.create({
        to,
        from: process.env.TWILIO_PHONE_NUMBER,
        url: `${process.env.NGROK_URL}/voice`
    });

    return call;
};

module.exports = { makeCall };