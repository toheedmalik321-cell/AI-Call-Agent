const VoiceResponse = require("twilio").twiml.VoiceResponse;
const twilio = require("twilio");

const { generateAIResponse } = require("../services/aiService");

const Call = require("../models/call");
const Agent = require("../models/agent");

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);


// ==========================================
// Start Call
// Browser -> Phone
// ==========================================

const startCall = async (req, res) => {

    try {

        console.log("=================================");
        console.log("STARTING AI CALL");
        console.log("User:", req.user.id);
        console.log("To:", process.env.MY_PHONE_NUMBER);
        console.log("From:", process.env.TWILIO_PHONE_NUMBER);
        console.log("=================================");


        const call = await client.calls.create({

            to: process.env.MY_PHONE_NUMBER,

            from: process.env.TWILIO_PHONE_NUMBER,

            url:
                process.env.NGROK_URL +
                "/voice?userId=" +
                req.user.id

        });


        console.log(
            "Twilio Call SID:",
            call.sid
        );


        res.json({

            success: true,

            message: "AI Sales Call Started!",

            sid: call.sid

        });


    } catch (err) {

        console.log(
            "Start Call Error:",
            err
        );


        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};


// ==========================================
// Incoming / Initial Call
// ==========================================

const incomingCall = async (req, res) => {

    try {

        console.log(
            "================================="
        );

        console.log(
            "INCOMING AI CALL"
        );

        console.log(
            "User ID:",
            req.query.userId
        );

        console.log(
            "================================="
        );


        // ==========================================
        // Find Active Agent
        // ==========================================

        const agent = await Agent.findOne({

            user: req.query.userId,

            isActive: true

        });


        if (!agent) {

            const twiml =
                new VoiceResponse();


            twiml.say(

                {
                    voice: "alice"
                },

                "Sorry, no active AI agent is available right now."

            );


            twiml.hangup();


            res.type("text/xml");

            return res.send(
                twiml.toString()
            );

        }


        const selectedVoice =
            agent.voice || "alice";


        // ==========================================
        // Create Call Record
        // ==========================================

        const currentCall =
            await Call.create({

                user: req.query.userId,

                agent: agent._id,

                customerName:
                    "Phone Customer",

                phoneNumber:
                    process.env.MY_PHONE_NUMBER,

                status: "calling",

                startedAt: new Date(),

                transcript: ""

            });


        console.log(
            "Call Record Created:",
            currentCall._id
        );


        // ==========================================
        // Twilio Response
        // ==========================================

        const twiml =
            new VoiceResponse();


        // ==========================================
        // Greeting
        // ==========================================

        const greeting =
            await generateAIResponse(

                "Start the sales conversation naturally. Greet the customer and briefly introduce yourself. Then ask one simple question to understand what the customer is looking for.",

                agent.role,

                req.query.userId,
                
                null,  // No sessionId for phone calls
                
                ""     // Empty transcript for first message

            );


        console.log(
            "AI Greeting:",
            greeting
        );


        // ==========================================
        // Save Greeting
        // ==========================================

        await Call.findByIdAndUpdate(

            currentCall._id,

            {

                transcript:
`AI:
${greeting}

`

            }

        );


        // ==========================================
        // Speak Greeting
        // ==========================================

        twiml.say(

            {
                voice: selectedVoice
            },

            greeting

        );


        // ==========================================
        // Listen To Customer
        // ==========================================

        const gather =
            twiml.gather({

                input: "speech",

                action:
                    "/process-speech?userId=" +
                    req.query.userId +
                    "&callId=" +
                    currentCall._id,

                method: "POST",

                speechTimeout: "auto",

                timeout: 8,

                language:
                    "en-US"

            });


        // Small natural prompt
        gather.say(

            {
                voice: selectedVoice
            },

            "I'm listening."

        );


        // ==========================================
        // If Customer Says Nothing
        // ==========================================

        twiml.say(

            {
                voice: selectedVoice
            },

            "I didn't hear anything. Please tell me what you're looking for."

        );


        twiml.redirect(

            "/voice?userId=" +
            req.query.userId +
            "&callId=" +
            currentCall._id

        );


        res.type("text/xml");

        res.send(
            twiml.toString()
        );


    } catch (err) {

        console.log(
            "Incoming Call Error:",
            err
        );


        const twiml =
            new VoiceResponse();


        twiml.say(

            {
                voice: "alice"
            },

            "Sorry, something went wrong. Please try again later."

        );


        twiml.hangup();


        res.type("text/xml");

        res.send(
            twiml.toString()
        );

    }

};


// ==========================================
// Process Customer Speech - FIX #1: callId Memory
// ==========================================

const processSpeech = async (req, res) => {

    try {

        const speech =
            (req.body.SpeechResult || "").trim();


        console.log(
            "================================="
        );

        console.log(
            "CUSTOMER SAID:",
            speech
        );

        console.log(
            "Call ID:",
            req.query.callId
        );

        console.log(
            "================================="
        );


        // ==========================================
        // Validate Speech
        // ==========================================

        if (!speech) {

            const twiml =
                new VoiceResponse();


            twiml.say(

                {
                    voice: "alice"
                },

                "I'm sorry, I didn't hear you. Could you please repeat that?"

            );


            const gather =
                twiml.gather({

                    input: "speech",

                    action:
                        "/process-speech?userId=" +
                        req.query.userId +
                        "&callId=" +
                        req.query.callId,

                    method: "POST",

                    speechTimeout: "auto",

                    timeout: 8

                });


            gather.say(

                {
                    voice: "alice"
                },

                "I'm listening."

            );


            res.type("text/xml");

            return res.send(
                twiml.toString()
            );

        }


        // ==========================================
        // Find Active Agent
        // ==========================================

        const agent =
            await Agent.findOne({

                user: req.query.userId,

                isActive: true

            });


        if (!agent) {

            const twiml =
                new VoiceResponse();


            twiml.say(

                {
                    voice: "alice"
                },

                "Sorry, no active AI agent was found."

            );


            twiml.hangup();


            res.type("text/xml");

            return res.send(
                twiml.toString()
            );

        }


        const selectedVoice =
            agent.voice || "alice";


        // ==========================================
        // Find Current Call - FIX: Use callId directly
        // ==========================================

        let currentCall = null;


        // FIX #2: Prefer callId over fallback query
        if (req.query.callId) {

            currentCall =
                await Call.findOne({

                    _id: req.query.callId,

                    user: req.query.userId,

                    status: "calling"

                });

            if (!currentCall) {
                console.log("⚠️ Call not found with callId:", req.query.callId);
            }

        }


        // Only fallback if callId didn't work
        if (!currentCall) {

            console.log("Falling back to query by user + status");

            currentCall =
                await Call.findOne({

                    user: req.query.userId,

                    status: "calling"

                })
                    .sort({
                        createdAt: -1
                    });

        }


        if (!currentCall) {

            const twiml =
                new VoiceResponse();


            twiml.say(

                {
                    voice: selectedVoice
                },

                "Sorry, I could not find the current call."

            );


            twiml.hangup();


            res.type("text/xml");

            return res.send(
                twiml.toString()
            );

        }


        // ==========================================
        // End Call Detection
        // ==========================================

        const endWords = [

            "bye",

            "goodbye",

            "good bye",

            "see you",

            "thank you bye",

            "thanks bye",

            "end call",

            "disconnect",

            "stop",

            "hang up",

            "hangup",

            "no thank you",

            "not interested goodbye"

        ];


        const lowerSpeech =
            speech.toLowerCase();


        const shouldEndCall =
            endWords.some(word =>
                lowerSpeech.includes(word)
            );


        // ==========================================
        // Customer Wants To End Call
        // ==========================================

        if (shouldEndCall) {

            const goodbye =
                "Thank you for your time. It was nice speaking with you. Have a wonderful day. Goodbye.";


            const previousTranscript =
                currentCall.transcript || "";


            const updatedTranscript =
`${previousTranscript}

Customer:
${speech}

AI:
${goodbye}

`;


            const duration =
                Math.floor(

                    (
                        new Date() -
                        currentCall.startedAt
                    ) / 1000

                );


            await Call.findByIdAndUpdate(

                currentCall._id,

                {

                    transcript:
                        updatedTranscript,

                    callSummary:
                        updatedTranscript.substring(
                            0,
                            1000
                        ),

                    customerMessage:
                        speech,

                    aiReply:
                        goodbye,

                    status:
                        "completed",

                    endedAt:
                        new Date(),

                    duration:
                        duration

                }

            );


            const twiml =
                new VoiceResponse();


            twiml.say(

                {
                    voice: selectedVoice
                },

                goodbye

            );


            twiml.hangup();


            res.type("text/xml");

            return res.send(
                twiml.toString()
            );

        }


        // ==========================================
        // Previous Conversation - FIX #3: Use transcript
        // ==========================================

        const previousTranscript =
            currentCall.transcript || "";


        // ==========================================
        // Generate AI Sales Response - FIX #4: Pass transcript
        // ==========================================

        const aiReply =
            await generateAIResponse(

                speech,

                agent.role ||
                "receptionist",

                req.query.userId,

                null,  // No sessionId for phone calls

                previousTranscript  // ← PASS TRANSCRIPT FOR PHONE CALLS

            );


        console.log(
            "AI RESPONSE:",
            aiReply
        );


        // ==========================================
        // Update Transcript
        // ==========================================

        const updatedTranscript =
`${previousTranscript}

Customer:
${speech}

AI:
${aiReply}

`;


        // ==========================================
        // Calculate Duration
        // ==========================================

        const duration =
            Math.floor(

                (
                    new Date() -
                    currentCall.startedAt
                ) / 1000

            );


        // ==========================================
        // Save Call
        // ==========================================

        await Call.findByIdAndUpdate(

            currentCall._id,

            {

                customerMessage:
                    speech,

                aiReply:
                    aiReply,

                transcript:
                    updatedTranscript,

                callSummary:
                    updatedTranscript.substring(
                        0,
                        1000
                    ),

                duration:
                    duration

            }

        );


        // ==========================================
        // Twilio Response
        // ==========================================

        const twiml =
            new VoiceResponse();


        // ==========================================
        // AI Speaks
        // ==========================================

        twiml.say(

            {
                voice: selectedVoice
            },

            aiReply

        );


        // ==========================================
        // Listen Again
        // ==========================================

        const gather =
            twiml.gather({

                input: "speech",

                action:
                    "/process-speech?userId=" +
                    req.query.userId +
                    "&callId=" +
                    currentCall._id,

                method: "POST",

                speechTimeout: "auto",

                timeout: 8

            });


        gather.say(

            {
                voice: selectedVoice
            },

            "Go ahead."

        );


        // ==========================================
        // No Response
        // ==========================================

        twiml.say(

            {
                voice: selectedVoice
            },

            "I didn't hear a response. Are you still there?"

        );


        twiml.redirect(

            "/voice?userId=" +
            req.query.userId +
            "&callId=" +
            currentCall._id

        );


        // ==========================================
        // Send TwiML
        // ==========================================

        res.type("text/xml");

        res.send(
            twiml.toString()
        );


    } catch (err) {

        console.log(
            "Process Speech Error:",
            err
        );


        const twiml =
            new VoiceResponse();


        twiml.say(

            {
                voice: "alice"
            },

            "Sorry, I am having trouble right now. Please try again."

        );


        twiml.hangup();


        res.type("text/xml");

        res.send(
            twiml.toString()
        );

    }

};


// ==========================================
// Export
// ==========================================

module.exports = {

    startCall,

    incomingCall,

    processSpeech

};