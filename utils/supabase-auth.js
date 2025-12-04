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
                    auth_provider: 'email', // Mark as email/password signup - user must use password to login
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
        // Determine if input is email or phone
        const isPhone = isValidPhone(emailOrPhone);
        
        // IMPORTANT: Check if user signed up with a social provider before allowing password login
        // Users who signed up with Google/Facebook cannot use email/phone password login
        // Users who signed up with email cannot use phone login and vice versa
        const emailToCheck = isPhone ? null : emailOrPhone.toLowerCase();
        const phoneToCheck = isPhone ? emailOrPhone : null;
        
        // Check by email
        if (emailToCheck) {
            const { data: existingProfile, error: profileCheckError } = await supabase
                .from('profiles')
                .select('id, auth_provider, email')
                .eq('email', emailToCheck)
                .single();
            
            if (existingProfile && existingProfile.auth_provider) {
                const storedProvider = existingProfile.auth_provider;
                
                // If user signed up with social auth or phone, reject email/password login
                if (storedProvider !== 'email' && storedProvider !== 'unknown') {
                    console.log(`⚠️ Auth provider mismatch: User signed up with '${storedProvider}' but trying to login with email/password`);
                    const providerName = storedProvider === 'phone' ? 'phone number and password' : storedProvider.charAt(0).toUpperCase() + storedProvider.slice(1);
                    return { 
                        success: false, 
                        message: `This account was created using ${providerName}. Please use ${providerName} to sign in.`,
                        wrongProvider: true,
                        correctProvider: storedProvider
                    };
                }
            }
        }
        
        // Check by phone
        if (phoneToCheck) {
            const { data: existingProfile, error: profileCheckError } = await supabase
                .from('profiles')
                .select('id, auth_provider, phone')
                .eq('phone', phoneToCheck)
                .single();
            
            if (existingProfile && existingProfile.auth_provider) {
                const storedProvider = existingProfile.auth_provider;
                
                // If user signed up with social auth or email, reject phone/password login
                if (storedProvider !== 'phone' && storedProvider !== 'unknown') {
                    console.log(`⚠️ Auth provider mismatch: User signed up with '${storedProvider}' but trying to login with phone/password`);
                    const providerName = storedProvider === 'email' ? 'email and password' : storedProvider.charAt(0).toUpperCase() + storedProvider.slice(1);
                    return { 
                        success: false, 
                        message: `This account was created using ${providerName}. Please use ${providerName} to sign in.`,
                        wrongProvider: true,
                        correctProvider: storedProvider
                    };
                }
            }
        }
        
        let authOptions;
        if (isPhone) {
            authOptions = {
                phone: emailOrPhone,
                password: password
            };
        } else {
            authOptions = {
                email: emailOrPhone,
                password: password
            };
        }
        
        const { data, error } = await supabase.auth.signInWithPassword(authOptions);

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
        
        // Update last login time and method for badge display
        const loginMethod = isPhone ? 'phone' : 'email';
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                last_login_at: new Date().toISOString(),
                last_login_method: loginMethod
            })
            .eq('id', data.user.id);
        
        if (updateError) {
            console.error('Failed to update last login:', updateError);
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
                role: profile?.role || 'user',
                lastLoginMethod: loginMethod // Include in response for frontend badge
            },
            token: data.session?.access_token,
            message: 'Login successful'
        };
    } catch (error) {
        console.error('Supabase login error:', error);
        
        // Provide more specific error messages
        let message = 'Login failed. Please try again.';
        if (error.message?.includes('Invalid login credentials')) {
            message = 'Invalid email/phone or password. Please check your credentials.';
        } else if (error.message?.includes('Email not confirmed')) {
            message = 'Please verify your email address before logging in.';
        } else if (error.message?.includes('Too many requests')) {
            message = 'Too many login attempts. Please try again later.';
        }
        
        return { success: false, message };
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
