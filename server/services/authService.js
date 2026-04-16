/* ═══════════════════════════════════════════════
   AUTH SERVICE — Customer signup & login
   ═══════════════════════════════════════════════ */

const crypto = require('crypto');
const db = require('../db');

// Simple in-memory sessions for customers - stores token -> userId mapping
const sessions = new Map();

// bcrypt salt rounds (higher = more secure but slower)
const SALT_ROUNDS = 10;

/**
 * Hash password with SHA256 (simple, no external deps)
 * @param {string} password
 * @returns {string} hashed password
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Compare password with hash
 * @param {string} password
 * @param {string} hashedPassword
 * @returns {boolean} match result
 */
function comparePassword(password, hashedPassword) {
    const hashedInput = hashPassword(password);
    return hashedInput === hashedPassword;
}

/**
 * Generate simple token using user ID
 * Token format: user_<id> (e.g., user_1, user_42)
 * @param {number} userId
 * @returns {string} session token
 */
function generateToken(userId) {
    return 'user_' + userId;
}

/**
 * Register new user
 * @param {Object} userData
 * @param {string} userData.name
 * @param {string} userData.email
 * @param {string} userData.phone
 * @param {string} userData.password
 * @returns {Promise<Object>} { success, user, token, error }
 */
async function signup({ name, email, phone, password }) {
    try {
        // Validate inputs
        if (!name || !email || !phone || !password) {
            return { success: false, error: 'All fields are required' };
        }

        if (password.length < 6) {
            return { success: false, error: 'Password must be at least 6 characters' };
        }

        // Check if email already exists
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return { success: false, error: 'Email already registered' };
        }

        // Hash password
        const hashedPassword = hashPassword(password);

        // Generate unique token that will also be the user ID
        const token = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
        console.log('CREATING USER with ID:', token);

        // Insert user with token as ID
        db.prepare(`
            INSERT INTO users (id, name, email, phone, password)
            VALUES (?, ?, ?, ?, ?)
        `).run(token, name, email, phone, hashedPassword);

        console.log('USER CREATED:', token);

        // Return user (without password)
        const user = {
            id: token,
            name,
            email,
            phone
        };

        return { success: true, user, token };
    } catch (err) {
        console.error('Signup error:', err.message);
        return { success: false, error: 'Registration failed' };
    }
}

/**
 * Login user
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} { success, user, token, error }
 */
async function login(email, password) {
    try {
        if (!email || !password) {
            return { success: false, error: 'Email and password required' };
        }

        // Hash password for comparison
        const hashedPassword = hashPassword(password);

        // Find user
        const user = db.prepare(`
            SELECT id, name, email, phone
            FROM users
            WHERE email = ? AND password = ?
        `).get(email, hashedPassword);

        if (!user) {
            return { success: false, error: 'Invalid credentials' };
        }

        // Generate token that matches user ID
        const token = user.id;
        console.log('LOGIN SUCCESS - Token:', token);

        return { success: true, user, token };
    } catch (err) {
        console.error('Login error:', err.message);
        return { success: false, error: 'Login failed' };
    }
}

/**
 * Verify if token is valid and return userId
 * @param {string} token
 * @returns {number|null} userId or null if invalid
 */
function verifyToken(token) {
    return sessions.get(token) || null;
}

/**
 * Logout user
 * @param {string} token
 */
function logout(token) {
    sessions.delete(token);
}

module.exports = {
    signup,
    login,
    verifyToken,
    logout
};
