/* ═══════════════════════════════════════════════
   INPUT VALIDATION UTILITIES
   Simple validation helpers for endpoints
   ═══════════════════════════════════════════════ */

const VALID_ROOM_TYPES = ['deluxe', 'suite', 'penthouse'];
const VALID_LOCATIONS = ['tokyo', 'paris', 'dubai', 'maldives', 'newyork', 'downtown', 'airport', 'suburb'];

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate date string (YYYY-MM-DD format)
 * @param {string} dateStr
 * @returns {boolean}
 */
function isValidDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
}

/**
 * Validate booking dates (checkIn < checkOut)
 * @param {string} checkIn
 * @param {string} checkOut
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateBookingDates(checkIn, checkOut) {
    if (!isValidDate(checkIn)) {
        return { valid: false, error: 'Invalid check-in date format (expected YYYY-MM-DD)' };
    }
    
    if (!isValidDate(checkOut)) {
        return { valid: false, error: 'Invalid check-out date format (expected YYYY-MM-DD)' };
    }
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    if (end <= start) {
        return { valid: false, error: 'Check-out date must be after check-in date' };
    }
    
    return { valid: true };
}

/**
 * Validate room type
 * @param {string} type
 * @returns {boolean}
 */
function isValidRoomType(type) {
    return VALID_ROOM_TYPES.includes(type);
}

/**
 * Validate location
 * @param {string} location
 * @returns {boolean}
 */
function isValidLocation(location) {
    return VALID_LOCATIONS.includes(location);
}

/**
 * Validate signup input
 * @param {Object} data
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateSignup({ name, email, phone, password }) {
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return { valid: false, error: 'Name is required (min 2 characters)' };
    }
    
    if (!email || !isValidEmail(email)) {
        return { valid: false, error: 'Valid email is required' };
    }
    
    if (!phone || typeof phone !== 'string' || phone.trim().length < 5) {
        return { valid: false, error: 'Phone number is required' };
    }
    
    if (!password || typeof password !== 'string' || password.length < 6) {
        return { valid: false, error: 'Password is required (min 6 characters)' };
    }
    
    return { valid: true };
}

/**
 * Validate login input
 * @param {Object} data
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateLogin({ email, password }) {
    if (!email || !isValidEmail(email)) {
        return { valid: false, error: 'Valid email is required' };
    }
    
    if (!password || typeof password !== 'string' || password.length < 6) {
        return { valid: false, error: 'Password is required (min 6 characters)' };
    }
    
    return { valid: true };
}

module.exports = {
    isValidEmail,
    isValidDate,
    validateBookingDates,
    isValidRoomType,
    isValidLocation,
    validateSignup,
    validateLogin,
    VALID_ROOM_TYPES,
    VALID_LOCATIONS
};
