// =============================================================================
// asteriskController.js — Self-hosted Asterisk ARI adapter (AI CallHub)
//
//   Ye controller sirf tab ACTIVE hota hai jab ye 3 env vars set hon:
//      ASTERISK_ARI_URL     (e.g. http://YOUR_VM_IP:8088  -> /ari)
//      ASTERISK_ARI_USER    (ari.conf wala user, e.g. "callhub")
//      ASTERISK_ARI_SECRET  (ari.conf wala password)
//   Agar na hon => saare routes 404 (server bilkul pehle jaisa, koi error nahi).
//
//   Render koi change NAHI : yahan sirf additive fallback add ho raha hai.
//   Real calls ke liye VM par SIP trunk (VoIP.ms / SIP.US / Telnyx-approved) chahiye.
// =============================================================================

const path = require("path");

const ENABLED = Boolean(
    process.env.ASTERISK_ARI_URL &&
    process.env.ASTERISK_ARI_USER &&
    process.env.ASTERISK_ARI_SECRET
);

// fetch global for ari.conf minified (Node >=18 me built-in hai)
const ARI_BASE = (process.env.ASTERISK_ARI_URL || "").replace(/\/+$/, "");
const ARI_USER = process.env.ASTERISK_ARI_USER || "";
const ARI_SECRET = process.env.ASTERISK_ARI_SECRET || "";

// =========================================================================
// Meterdown — placeholder trunk dailplan (VM par extensions_cai.conf se)
// =========================================================================

const checkConfig = async (req, res) => {
    return res.status(200).json({
        success: true,
        enabled: ENABLED,
        ariBase: ARI_BASE || null,
        trunk:
            process.env.ASTERISK_TRUNK_HOST ||
            "not set - VM par pjsip_trunk.conf daalo"
    });
};

// =========================================================================
// /api/asterisk/start-outbound  ->  originate sip call via ARI (Stasis app)
// =========================================================================

const startOutbound = async (req, res) => {
    try {
        if (!ENABLED) {
            return res.status(404).json({
                success: false,
                code: "NO_ASTERISK",
                message:
                    "Asterisk ARI env vars missing - VM setup karo (see setup/setup-asterisk.sh)"
            });
        }

        const to =
            req.body.to ||
            process.env.MY_PHONE_NUMBER ||
            "";
        const agentId =
            req.body.agentId || "";

        // ARI REST: channels.originate via Stasis app "callhub"
        const params = new URLSearchParams({
            endpoint: `PJSIP/${to}@trunk-out`,
            app: "callhub",
            callerId: `"AI CallHub" <${process.env.ASTERISK_PHONE_NUMBER || "AI"}>`,
            variables: `USERID=${req.user ? req.user.id : req.query.userId || ""},AGENTID=${agentId}`
        });

        const resAri = await fetch(`${ARI_BASE}/ari/channels?${params}`, {
            method: "POST",
            headers: {
                Authorization:
                    "Basic " +
                    Buffer.from(`${ARI_USER}:${ARI_SECRET}`).toString("base64")
            }
        });

        if (!resAri.ok) {
            const txt = await resAri.text();
            console.log("[ASTERISK] originate failed:", resAri.status, txt.slice(0, 200));
            return res.status(502).json({
                success: false,
                message: "Asterisk originate failed: " + txt.slice(0, 200)
            });
        }

        const chan = await resAri.json();

        return res.json({
            success: true,
            message: "Asterisk outbound call originated (Stasis app: callhub)",
            channelId: chan.id || null,
            provider: "asterisk"
        });
    } catch (err) {
        console.log("[ASTERISK] startOutbound error:", err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// =========================================================================
// /api/asterisk/health  -> Render health-check-friendly
// =========================================================================

const health = async (req, res) => {
    return res.status(200).json({
        success: true,
        provider: "asterisk",
        enabled: ENABLED
    });
};

module.exports = { startOutbound, health, checkConfig };
