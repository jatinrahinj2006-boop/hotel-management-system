/* ═══════════════════════════════════════════════
   AUTH ROUTES — Customer authentication
   ═══════════════════════════════════════════════ */

const { Router } = require('express');
const { signup, login, logout } = require('../services/authService');
const { rateLimit } = require('../middleware/rateLimit');
const { validateSignup, validateLogin } = require('../utils/validation');

const router = Router();

/**
 * POST /api/auth/signup
 * Register new customer
 */
router.post('/signup', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        
        // Validate input
        const validation = validateSignup({ name, email, phone, password });
        if (!validation.valid) {
            return res.status(400).json({ success: false, error: validation.error });
        }
        
        const result = await signup({ name, email, phone, password });
        
        if (result.success) {
            res.status(201).json({
                success: true,
                user: result.user,
                token: result.token
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (err) {
        console.error('POST /api/auth/signup error:', err.message);
        res.status(500).json({ error: 'Signup failed' });
    }
});

/**
 * POST /api/auth/login
 * Customer login — rate limited
 */
router.post('/login', rateLimit, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        const validation = validateLogin({ email, password });
        if (!validation.valid) {
            return res.status(400).json({ success: false, error: validation.error });
        }
        
        const result = await login(email, password);
        
        if (result.success) {
            res.json({
                success: true,
                user: result.user,
                token: result.token
            });
        } else {
            res.status(401).json({
                success: false,
                error: result.error
            });
        }
    } catch (err) {
        console.error('POST /api/auth/login error:', err.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/logout
 * Customer logout
 */
router.post('/logout', (req, res) => {
    try {
        const { token } = req.body;
        if (token) {
            logout(token);
        }
        res.json({ success: true });
    } catch (err) {
        console.error('POST /api/auth/logout error:', err.message);
        res.status(500).json({ error: 'Logout failed' });
    }
});

module.exports = router;
