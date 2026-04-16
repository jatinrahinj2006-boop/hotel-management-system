/* ═══════════════════════════════════════════════
   RATE LIMITING MIDDLEWARE
   Limit: 50 requests per minute per IP
   ═══════════════════════════════════════════════ */

// In-memory store: IP -> { count, resetTime }
const rateLimitStore = new Map();

// Constants
const MAX_REQUESTS = 50;
const WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries() {
    const now = Date.now();
    for (const [ip, data] of rateLimitStore.entries()) {
        if (now > data.resetTime) {
            rateLimitStore.delete(ip);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Rate limiting middleware
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
function rateLimit(req, res, next) {
    // Get client IP
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    // Get or create rate limit entry
    let limitData = rateLimitStore.get(ip);

    if (!limitData || now > limitData.resetTime) {
        // Create new window
        limitData = {
            count: 1,
            resetTime: now + WINDOW_MS
        };
        rateLimitStore.set(ip, limitData);
    } else {
        // Increment count
        limitData.count++;
    }

    // Set headers
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - limitData.count));
    res.setHeader('X-RateLimit-Reset', limitData.resetTime);

    // Check if limit exceeded
    if (limitData.count > MAX_REQUESTS) {
        return res.status(429).json({
            error: 'Too many requests, try again later'
        });
    }

    next();
}

module.exports = { rateLimit };
