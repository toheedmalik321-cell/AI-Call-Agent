// =============================================================================
// sanitize.js - NoSQL injection protection
//
// Express's `extended: true` query parser can turn  ?user[$ne]=1  into an
// object, which then reaches Mongoose and bypasses filters (classic NoSQL
// injection). This middleware strips dangerous keys ($-prefixed operators and
// dots) from body, query and params BEFORE any route/controller sees them.
//
// NOTE: In Express 5 req.query is a getter-only property, so we MUTATE the
// existing objects in place instead of reassigning them.
// =============================================================================

const isPlainObject = (v) =>
    v !== null && typeof v === "object" && !Array.isArray(v);

// Recursively rebuild a safe value
const cleanValue = (value, depth = 0) => {
    if (depth > 8) return undefined;

    if (Array.isArray(value)) {
        return value.map((v) => cleanValue(v, depth + 1)).filter((v) => v !== undefined);
    }

    if (isPlainObject(value)) {
        const out = {};
        for (const key of Object.keys(value)) {
            if (key.startsWith("$") || key.includes(".")) continue;
            const cleaned = cleanValue(value[key], depth + 1);
            if (cleaned !== undefined) out[key] = cleaned;
        }
        // Object became empty only because everything inside was stripped
        // (e.g. { $ne: null }) -> drop it entirely instead of leaving {}
        if (Object.keys(out).length === 0 && Object.keys(value).length > 0) {
            return undefined;
        }
        return out;
    }

    return value; // primitives pass through
};

// Replace dangerous values inside an existing object, in place
const sanitizeInPlace = (obj) => {
    if (!obj || typeof obj !== "object") return;

    for (const key of Object.keys(obj)) {
        if (key.startsWith("$") || key.includes(".")) {
            delete obj[key];
            continue;
        }
        const cleaned = cleanValue(obj[key]);
        if (cleaned === undefined) {
            delete obj[key];
        } else if (cleaned !== obj[key] && typeof obj[key] === "object") {
            obj[key] = cleaned;
        }
    }
};

const sanitize = (req, res, next) => {
    // req.body can be an object (json/urlencoded) or a Buffer (express.raw
    // webhooks). Buffers are not ours to touch - skip them.
    if (
        req.body &&
        typeof req.body === "object" &&
        !Buffer.isBuffer(req.body)
    ) {
        const safeBody = cleanValue(req.body);
        // Always overwrite: if everything was stripped, use an empty object
        // so the original (unsafe) body can never leak through.
        req.body = safeBody === undefined ? {} : safeBody;
    }
    sanitizeInPlace(req.query);
    sanitizeInPlace(req.params);
    next();
};

module.exports = sanitize;
