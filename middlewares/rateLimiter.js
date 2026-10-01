// =============================================================================
// rateLimiter.js - Brute-force / abuse protection
//
// Custom in-memory limiter (no external dependency needed).
// For multi-instance deployments swap the Map for Redis; Render free tier is
// single-instance so this is safe here.
// =============================================================================

const buckets = new Map();

// Auto-clean expired buckets so memory never grows unbounded
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
        if (bucket.resetTime < now) buckets.delete(key);
    }
}, 10 * 60 * 1000).unref();

const rateLimiter = ({ windowMs = 15 * 60 * 1000, max = 100, message = "Too many requests, please try again later.", keyBy = null, skipSuccessful = false } = {}) => {
    return (req, res, next) => {
        const id = keyBy ? keyBy(req) : (req.user && req.user.id) || req.ip;
        const now = Date.now();
        const key = `${req.method}:${req.baseUrl || ""}${req.path}:${id}`;

        let bucket = buckets.get(key);

        if (!bucket || bucket.resetTime < now) {
            bucket = { count: 0, resetTime: now + windowMs };
            buckets.set(key, bucket);
        }

        bucket.count++;

        const remaining = Math.max(0, max - bucket.count);

        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", remaining);
        res.setHeader("X-RateLimit-Reset", Math.ceil(bucket.resetTime / 1000));

        if (bucket.count > max) {
            const retryAfter = Math.ceil((bucket.resetTime - now) / 1000);
            res.setHeader("Retry-After", retryAfter);
            return res.status(429).json({
                success: false,
                message,
                retryAfter
            });
        }

        // Optionally decay the counter when the response was successful
        if (skipSuccessful) {
            res.on("finish", () => {
                if (res.statusCode < 400) bucket.count = Math.max(0, bucket.count - 1);
            });
        }

        next();
    };
};

// Pre-configured limiters for common cases

// General API abuse guard - generous so normal users are never affected
const apiLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: "Too many requests. Please slow down."
});

// Login / register - tight, this is the brute-force target
const authLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many attempts. Please wait 15 minutes and try again.",
    skipSuccessful: true
});

// Password reset / verification emails - prevent mail-bombing
const emailLimiter = rateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: "Too many emails requested. Please try again later.",
    skipSuccessful: true
});

module.exports = { rateLimiter, apiLimiter, authLimiter, emailLimiter };