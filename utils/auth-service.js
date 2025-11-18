/**
 * Production-Ready Authentication Service
 * Handles user registration, login, logout, and session management
 * Uses Supabase Auth + Custom Users Table
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Registration result
 */
async function registerUser(userData) {
    const { email, password, fullName, phone } = userData;

    try {
        // 1. Validate input
        if (!email || !password || !fullName) {
            return {
                success: false,
                message: 'Email, password, and full name are required'
            };
        }

        // 2. Check if user already exists by email
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            return {
                success: false,
                message: 'User with this email already exists'
            };
        }

        // 3. Check if phone number already exists (if provided)
        if (phone) {
            const { data: existingPhone } = await supabase
                .from('users')
                .select('id, phone')
                .eq('phone', phone)
                .single();

            if (existingPhone) {
                return {
                    success: false,
                    message: 'Phone number already registered'
                };
            }

            // Also check in profiles table
            const { data: existingPhoneProfile } = await supabase
                .from('profiles')
                .select('id, phone')
                .eq('phone', phone)
                .single();

            if (existingPhoneProfile) {
                return {
                    success: false,
                    message: 'Phone number already registered'
                };
            }
        }

        // 3. Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 4. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email.toLowerCase(),
            password: password,
            email_confirm: false,
            user_metadata: {
                full_name: fullName,
                phone: phone || null
            }
        });

        if (authError) {
            console.error('Supabase Auth error:', authError);
            return {
                success: false,
                message: authError.message || 'Failed to create auth user'
            };
        }

        // 5. Create user in users table
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
                id: authData.user.id,
                email: email.toLowerCase(),
                password_hash: passwordHash,
                full_name: fullName,
                phone: phone || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (userError) {
            console.error('User table error:', userError);
            // Rollback: Delete auth user
            await supabase.auth.admin.deleteUser(authData.user.id);
            return {
                success: false,
                message: 'Failed to create user profile'
            };
        }

        // 6. Create wallet for user
        try {
            await supabase
                .from('wallets')
                .insert({
                    user_id: user.id,
                    balance: 0.00,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
        } catch (walletError) {
            console.error('Wallet creation error:', walletError);
            // Don't fail registration if wallet creation fails
        }

        // 7. Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return {
            success: true,
            message: 'Registration successful',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                phone: user.phone
            },
            token
        };

    } catch (error) {
        console.error('Registration error:', error);
        return {
            success: false,
            message: 'An error occurred during registration'
        };
    }
}

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Login result
 */
async function loginUser(email, password) {
    try {
        // 1. Validate input
        if (!email || !password) {
            return {
                success: false,
                message: 'Email and password are required'
            };
        }

        // 2. Find user in database
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (userError || !user) {
            return {
                success: false,
                message: 'Invalid email or password'
            };
        }

        // 3. Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return {
                success: false,
                message: 'Invalid email or password'
            };
        }

        // 4. Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase(),
            password: password
        });

        if (authError) {
            console.error('Supabase Auth login error:', authError);
            // Continue even if Supabase auth fails, use our own JWT
        }

        // 5. Update last login
        await supabase
            .from('users')
            .update({ 
                last_login: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        // 6. Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 7. Get user wallet
        const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', user.id)
            .single();

        return {
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                phone: user.phone,
                emailVerified: user.email_verified || false,
                phoneVerified: user.phone_verified || false,
                zimscore: user.zimscore || 0,
                walletBalance: wallet?.balance || 0
            },
            token,
            supabaseToken: authData?.session?.access_token || null
        };

    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            message: 'An error occurred during login'
        };
    }
}

/**
 * Logout user
 * @param {string} token - JWT token
 * @returns {Promise<Object>} Logout result
 */
async function logoutUser(token) {
    try {
        // 1. Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return {
                success: false,
                message: 'Invalid token'
            };
        }

        // 2. Sign out from Supabase
        await supabase.auth.signOut();

        return {
            success: true,
            message: 'Logout successful'
        };

    } catch (error) {
        console.error('Logout error:', error);
        return {
            success: false,
            message: 'An error occurred during logout'
        };
    }
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token or null
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
async function getUserById(userId) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, full_name, phone, email_verified, phone_verified, zimscore, created_at')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return null;
        }

        // Get wallet balance
        const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', userId)
            .single();

        return {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            phone: user.phone,
            emailVerified: user.email_verified || false,
            phoneVerified: user.phone_verified || false,
            zimscore: user.zimscore || 0,
            walletBalance: wallet?.balance || 0,
            createdAt: user.created_at
        };

    } catch (error) {
        console.error('Get user error:', error);
        return null;
    }
}

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} Reset result
 */
async function requestPasswordReset(email) {
    try {
        // 1. Check if user exists
        const { data: user } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email.toLowerCase())
            .single();

        if (!user) {
            // Don't reveal if user exists
            return {
                success: true,
                message: 'If an account exists with this email, you will receive a password reset link'
            };
        }

        // 2. Send password reset email via Supabase
        const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
            redirectTo: `${process.env.FRONTEND_URL}/reset-password`
        });

        if (error) {
            console.error('Password reset error:', error);
        }

        return {
            success: true,
            message: 'If an account exists with this email, you will receive a password reset link'
        };

    } catch (error) {
        console.error('Password reset request error:', error);
        return {
            success: false,
            message: 'An error occurred while processing your request'
        };
    }
}

/**
 * Reset password
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Reset result
 */
async function resetPassword(token, newPassword) {
    try {
        // 1. Verify token
        const decoded = verifyToken(token);

        if (!decoded) {
            return {
                success: false,
                message: 'Invalid or expired reset token'
            };
        }

        // 2. Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // 3. Update password in database
        const { error: dbError } = await supabase
            .from('users')
            .update({ 
                password_hash: passwordHash,
                updated_at: new Date().toISOString()
            })
            .eq('id', decoded.userId);

        if (dbError) {
            console.error('Database password update error:', dbError);
            return {
                success: false,
                message: 'Failed to update password'
            };
        }

        // 4. Update password in Supabase Auth
        const { error: authError } = await supabase.auth.admin.updateUserById(
            decoded.userId,
            { password: newPassword }
        );

        if (authError) {
            console.error('Auth password update error:', authError);
        }

        return {
            success: true,
            message: 'Password reset successful'
        };

    } catch (error) {
        console.error('Password reset error:', error);
        return {
            success: false,
            message: 'An error occurred while resetting password'
        };
    }
}

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    verifyToken,
    getUserById,
    requestPasswordReset,
    resetPassword,
    supabase
};
