const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const validator = require('validator');

// Initialize Supabase client with error handling
let supabase;
try {
    if (!process.env.SUPABASE_URL) {
        throw new Error('SUPABASE_URL is not set in environment variables');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is not set in environment variables');
    }
    
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
    console.log('✅ Supabase client initialized successfully');
} catch (error) {
    console.error('❌ Supabase initialization failed:', error.message);
    console.log('⚠️  Routes requiring Supabase will not function');
    // Create a dummy client that throws helpful errors
    supabase = new Proxy({}, {
        get: () => {
            throw new Error('Supabase client not initialized. Check environment variables.');
        }
    });
}

// Generate JWT Token (for additional security layer)
const generateToken = (userId, expiresIn = '24h') => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: expiresIn
    });
};

// Verify JWT Token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

// Validate email
const isValidEmail = (email) => {
    return validator.isEmail(email);
};

// Validate phone number
const isValidPhone = (phone) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
};

// Validate password strength
const isValidPassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

// Register user with Supabase
const registerUser = async (userData) => {
    const { firstName, lastName, email, phone, password } = userData;

    try {
        // Sign up with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone,
                    email_confirmed: false
                }
            }
        });

        if (error) {
            throw error;
        }

        // Create profile in users table
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: data.user.id,
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone: phone,
                    onboarding_completed: false,
                    profile_completed: false,
                    role: 'user'
                });

            if (profileError) {
                console.error('Profile creation error:', profileError);
                // Don't fail registration if profile creation fails
            }
        }

        return { success: true, user: data.user, message: 'User registered successfully. Please check your email for verification.' };
    } catch (error) {
        console.error('Supabase registration error:', error);
        return { success: false, message: error.message };
    }
};

// Sign in user with Supabase
const signInUser = async (emailOrPhone, password, rememberMe = false) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailOrPhone,
            password: password
        });

        if (error) {
            throw error;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error('Profile fetch error:', profileError);
        }

        return {
            success: true,
            user: {
                id: data.user.id,
                firstName: profile?.first_name || data.user.user_metadata?.first_name,
                lastName: profile?.last_name || data.user.user_metadata?.last_name,
                email: data.user.email,
                phone: profile?.phone || data.user.user_metadata?.phone,
                emailVerified: data.user.email_confirmed_at ? true : false,
                phoneVerified: profile?.phone_verified || false,
                onboardingCompleted: profile?.onboarding_completed || false,
                profileCompleted: profile?.profile_completed || false,
                role: profile?.role || 'user'
            },
            token: data.session?.access_token,
            message: 'Login successful'
        };
    } catch (error) {
        console.error('Supabase login error:', error);
        return { success: false, message: error.message };
    }
};

// Send password reset email
const sendPasswordReset = async (email) => {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.FRONTEND_URL}/reset-password`
        });

        if (error) {
            throw error;
        }

        return { success: true, message: 'Password reset email sent successfully' };
    } catch (error) {
        console.error('Supabase password reset error:', error);
        return { success: false, message: error.message };
    }
};

// Update password
const updatePassword = async (newPassword) => {
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            throw error;
        }

        return { success: true, message: 'Password updated successfully' };
    } catch (error) {
        console.error('Supabase password update error:', error);
        return { success: false, message: error.message };
    }
};

// Verify OTP (for email verification)
const verifyOTP = async (email, token) => {
    try {
        const { error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email'
        });

        if (error) {
            throw error;
        }

        return { success: true, message: 'Email verified successfully' };
    } catch (error) {
        console.error('Supabase OTP verification error:', error);
        return { success: false, message: error.message };
    }
};

// Get current user
const getCurrentUser = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
            throw error;
        }

        return user;
    } catch (error) {
        console.error('Get current user error:', error);
        return null;
    }
};

// Sign out user
const signOutUser = async () => {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            throw error;
        }

        return { success: true, message: 'Signed out successfully' };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, message: error.message };
    }
};

// Rate limiting helper
const checkRateLimit = (req, limits) => {
    // Simple in-memory rate limiting
    // In production, use Redis or similar
    const key = req.ip + req.path;
    const now = Date.now();

    if (!global.rateLimitStore) {
        global.rateLimitStore = new Map();
    }

    const userRequests = global.rateLimitStore.get(key) || [];
    const recentRequests = userRequests.filter(time => now - time < limits.windowMs);

    if (recentRequests.length >= limits.max) {
        return false;
    }

    recentRequests.push(now);
    global.rateLimitStore.set(key, recentRequests);

    return true;
};

module.exports = {
    supabase,
    generateToken,
    verifyToken,
    isValidEmail,
    isValidPhone,
    isValidPassword,
    registerUser,
    signInUser,
    sendPasswordReset,
    updatePassword,
    verifyOTP,
    getCurrentUser,
    signOutUser,
    checkRateLimit
};
