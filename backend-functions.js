// ========== AUTHENTICATION SYSTEM BACKEND FUNCTIONS ==========
// Required backend functions for ZimCrowd authentication system

// 1. USER AUTHENTICATION
app.post('/api/auth/login', async (req, res) => {
    // Function: Authenticate user with email/phone and password
    // Parameters: { emailOrPhone: string, password: string, rememberMe: boolean }
    // Returns: { token: string, user: object, expiresAt: Date }
    // Features: JWT token generation, password hashing verification
});

// 2. PASSWORD RESET REQUEST
app.post('/api/auth/forgot-password', async (req, res) => {
    // Function: Initiate password reset process
    // Parameters: { emailOrPhone: string }
    // Returns: { success: boolean, message: string }
    // Features: Generate OTP, send via email/SMS, store in cache with expiration
});

// 3. OTP VERIFICATION
app.post('/api/auth/verify-otp', async (req, res) => {
    // Function: Verify OTP code for password reset or signup
    // Parameters: { emailOrPhone: string, otp: string, type: 'reset'|'signup' }
    // Returns: { success: boolean, token?: string, user?: object }
    // Features: Validate OTP against cache, handle expiration, generate temp token
});

// 4. PASSWORD RESET
app.post('/api/auth/reset-password', async (req, res) => {
    // Function: Update user password with new one
    // Parameters: { token: string, newPassword: string }
    // Returns: { success: boolean, message: string }
    // Features: Validate reset token, hash new password, update user record
});

// 5. USER REGISTRATION
app.post('/api/auth/register', async (req, res) => {
    // Function: Create new user account
    // Parameters: { email: string, phone: string, password: string, firstName: string, lastName: string, ... }
    // Returns: { success: boolean, user: object, message: string }
    // Features: Email/phone validation, password strength check, duplicate check
});

// 6. EMAIL VERIFICATION
app.post('/api/auth/send-verification-email', async (req, res) => {
    // Function: Send verification email for new accounts
    // Parameters: { email: string }
    // Returns: { success: boolean, message: string }
    // Features: Generate verification token, send email with link
});

// 7. EMAIL VERIFICATION CONFIRM
app.post('/api/auth/verify-email', async (req, res) => {
    // Function: Confirm email verification
    // Parameters: { token: string }
    // Returns: { success: boolean, message: string }
    // Features: Validate verification token, mark email as verified
});

// ========== SUPPORTING UTILITIES ==========

// 8. OTP GENERATION
function generateOTP() {
    // Function: Generate 6-digit OTP code
    // Returns: string (6 digits)
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 9. PASSWORD HASHING
function hashPassword(password) {
    // Function: Hash password with bcrypt
    // Parameters: password: string
    // Returns: hashed password string
}

// 10. PASSWORD VERIFICATION
function verifyPassword(password, hash) {
    // Function: Verify password against hash
    // Parameters: password: string, hash: string
    // Returns: boolean
}

// 11. JWT TOKEN GENERATION
function generateJWT(user, expiresIn = '24h') {
    // Function: Generate JWT token
    // Parameters: user: object, expiresIn: string
    // Returns: token string
}

// 12. JWT TOKEN VERIFICATION
function verifyJWT(token) {
    // Function: Verify and decode JWT token
    // Parameters: token: string
    // Returns: decoded user object or null
}

// 13. EMAIL SENDING
async function sendEmail(to, subject, html) {
    // Function: Send email using nodemailer or similar
    // Parameters: to: string, subject: string, html: string
    // Returns: boolean (success)
}

// 14. SMS SENDING
async function sendSMS(to, message) {
    // Function: Send SMS using Twilio or similar service
    // Parameters: to: string, message: string
    // Returns: boolean (success)
}

// 15. RATE LIMITING
const rateLimiter = require('express-rate-limit');
const authLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.'
});

// 16. INPUT VALIDATION
const validateEmail = (email) => {
    // Function: Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePhone = (phone) => {
    // Function: Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
};

const validatePassword = (password) => {
    // Function: Validate password strength
    // Minimum 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

// ========== DATABASE MODELS ==========
// User Model Schema
/*
{
    _id: ObjectId,
    email: { type: String, required: true, unique: true },
    phone: { type: String, unique: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String,
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },
    profileCompleted: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}
*/

// OTP Cache Model Schema
/*
{
    _id: ObjectId,
    identifier: String, // email or phone
    otp: String,
    type: { type: String, enum: ['reset', 'signup', 'verification'] },
    expiresAt: { type: Date, default: Date.now, expires: 300 }, // 5 minutes
    attempts: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}
*/

// ========== MIDDLEWARE ==========
const authenticateToken = (req, res, next) => {
    // Middleware: Verify JWT token
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access token required' });

    const user = verifyJWT(token);
    if (!user) return res.status(403).json({ message: 'Invalid token' });

    req.user = user;
    next();
};

const requireAuth = (req, res, next) => {
    // Middleware: Require authentication for protected routes
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    next();
};

// ========== API ROUTES SETUP ==========
app.use('/api/auth', authLimiter); // Apply rate limiting to auth routes

// Public routes
app.post('/api/auth/login', loginUser);
app.post('/api/auth/register', registerUser);
app.post('/api/auth/forgot-password', forgotPassword);
app.post('/api/auth/verify-otp', verifyOTP);
app.post('/api/auth/reset-password', resetPassword);
app.post('/api/auth/send-verification-email', sendVerificationEmail);
app.post('/api/auth/verify-email', verifyEmail);

// Protected routes (require authentication)
app.use('/api/user', authenticateToken, requireAuth);
// ... user profile routes

// ========== DEPENDENCIES ==========
// Required Node.js packages:
// - express (web framework)
// - mongoose or sequelize (database ORM)
// - bcryptjs (password hashing)
// - jsonwebtoken (JWT tokens)
// - nodemailer (email sending)
// - twilio (SMS sending, optional)
// - express-rate-limit (rate limiting)
// - validator (input validation)
// - express-validator (request validation)
// - helmet (security headers)
// - cors (cross-origin requests)
// - dotenv (environment variables)

module.exports = {
    generateOTP,
    hashPassword,
    verifyPassword,
    generateJWT,
    verifyJWT,
    sendEmail,
    sendSMS,
    validateEmail,
    validatePhone,
    validatePassword
};
