/* ═══════════════════════════════════════════════
   SECURITY HEADERS MIDDLEWARE
   Protect from common vulnerabilities
   ═══════════════════════════════════════════════ */

/**
 * Middleware to add security headers to all responses
 * Protects against common web vulnerabilities
 */
function securityHeaders(req, res, next) {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking by disallowing iframe embedding
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Enable XSS protection in browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Hide server information
    res.setHeader('X-Powered-By', 'Aurum Hotel Manager');
    
    next();
}

module.exports = { securityHeaders };
