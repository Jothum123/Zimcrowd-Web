// Social authentication routes for Google and Facebook OAuth
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
if (!process.env.SUPABASE_URL) {
    console.error('❌ SUPABASE_URL is not set in environment variables');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is not set');
}

// Create Supabase client directly
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

console.log('✅ Social auth initialized with Supabase URL:', process.env.SUPABASE_URL?.substring(0, 30) + '...');

const socialRouter = express.Router();

// Google OAuth
socialRouter.get('/google', async (req, res) => {
    try {
        const { mode = 'login' } = req.query; // 'login' or 'signup'
        
        // Check if Supabase is configured
        if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
            console.error('❌ Supabase not configured for social auth');
            return res.status(500).json({
                success: false,
                message: 'Social authentication is not configured. Please contact support.',
                error: 'Missing Supabase credentials'
            });
        }
        
        // Use the current deployment URL for callback (production-ready)
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : process.env.BACKEND_URL || 'https://zimcrowd-backend.vercel.app';
        
        const redirectTo = `${baseUrl}/api/social-auth/callback`;
        
        // Encode mode in state parameter
        const state = Buffer.from(JSON.stringify({ mode })).toString('base64');

        console.log('🔄 Initiating Google OAuth:', { mode, redirectTo, state });

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectTo,
                queryParams: {
                    state: state,
                    access_type: 'offline',
                    prompt: 'consent'
                },
                scopes: 'email profile' // Request email and profile info
            }
        });

        if (error) {
            console.error('❌ Google OAuth error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to initiate Google authentication',
                error: error.message
            });
        }

        if (!data || !data.url) {
            console.error('❌ No OAuth URL returned from Supabase');
            return res.status(500).json({
                success: false,
                message: 'Failed to get OAuth URL',
                error: 'No URL returned'
            });
        }

        console.log('✅ Redirecting to Google OAuth URL');
        // Redirect to OAuth provider
        res.redirect(data.url);
    } catch (error) {
        console.error('Google auth route error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
});

// Facebook OAuth
socialRouter.get('/facebook', async (req, res) => {
    try {
        const { mode = 'login' } = req.query; // 'login' or 'signup'
        
        // Check if Supabase is configured
        if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
            console.error('❌ Supabase not configured for social auth');
            return res.status(500).json({
                success: false,
                message: 'Social authentication is not configured. Please contact support.',
                error: 'Missing Supabase credentials'
            });
        }
        
        // Use the current deployment URL for callback (production-ready)
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : process.env.BACKEND_URL || 'https://zimcrowd-backend.vercel.app';
        
        const redirectTo = `${baseUrl}/api/social-auth/callback`;
        
        // Encode mode in state parameter
        const state = Buffer.from(JSON.stringify({ mode })).toString('base64');

        console.log('🔄 Initiating Facebook OAuth:', { mode, redirectTo, state });

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                redirectTo: redirectTo,
                queryParams: {
                    state: state
                },
                scopes: 'email public_profile' // Request email and public profile info
            }
        });

        if (error) {
            console.error('❌ Facebook OAuth error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to initiate Facebook authentication',
                error: error.message
            });
        }

        if (!data || !data.url) {
            console.error('❌ No OAuth URL returned from Supabase');
            return res.status(500).json({
                success: false,
                message: 'Failed to get OAuth URL',
                error: 'No URL returned'
            });
        }

        console.log('✅ Redirecting to Facebook OAuth URL');
        // Redirect to OAuth provider
        res.redirect(data.url);
    } catch (error) {
        console.error('Facebook auth route error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
});

// OAuth callback handler
socialRouter.get('/callback', async (req, res) => {
    try {
        console.log('🔄 Social auth callback received:', req.query);
        
        // Get the session from URL parameters (Supabase OAuth callback format)
        const { code, state, error: authError } = req.query;
        
        if (authError) {
            console.error('OAuth callback error:', authError);
            const frontendUrl = process.env.FRONTEND_URL || 'https://zimcrowd.com';
            return res.redirect(`${frontendUrl}/login.html?error=oauth_failed`);
        }

        if (!code) {
            console.error('No authorization code received');
            const frontendUrl = process.env.FRONTEND_URL || 'https://zimcrowd.com';
            return res.redirect(`${frontendUrl}/login.html?error=no_code`);
        }

        // Exchange code for session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Code exchange error:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'https://zimcrowd.com';
            return res.redirect(`${frontendUrl}/login.html?error=exchange_failed`);
        }

        if (data.session) {
            // User is authenticated, check if we need to create/update profile
            const user = data.session.user;
            
            // Extract mode from state parameter or query params
            let mode = 'login'; // default
            try {
                if (state) {
                    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
                    mode = stateData.mode || 'login';
                } else if (req.query.mode) {
                    mode = req.query.mode;
                }
            } catch (e) {
                console.log('Could not parse state, using default mode');
            }
            
            console.log('🔍 Social auth mode:', mode, 'for user:', user.email);

            // Check if profile exists
            const { data: existingProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Profile check error:', profileError);
            }

            // Log raw metadata for debugging
            console.log('📦 Raw user metadata from provider:', JSON.stringify(user.user_metadata, null, 2));
            console.log('📦 Raw app metadata:', JSON.stringify(user.app_metadata, null, 2));
            
            // Extract comprehensive user details from social provider (for all users)
            // Try multiple field names that different providers use
            const firstName = user.user_metadata?.first_name || 
                              user.user_metadata?.given_name || 
                              user.user_metadata?.full_name?.split(' ')[0] || 
                              user.user_metadata?.name?.split(' ')[0] || 
                              user.email?.split('@')[0] || // Fallback to email username
                              '';
            
            const lastName = user.user_metadata?.last_name || 
                             user.user_metadata?.family_name || 
                             user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 
                             user.user_metadata?.name?.split(' ').slice(1).join(' ') || 
                             '';
            
            const avatarUrl = user.user_metadata?.avatar_url || 
                              user.user_metadata?.picture || 
                              user.user_metadata?.profile_picture || 
                              user.user_metadata?.image_url || 
                              user.user_metadata?.photo || 
                              null;
            
            const authProvider = user.app_metadata?.provider || 'unknown';
            
            console.log('🔍 Extracted social profile data:', {
                firstName,
                lastName,
                fullName: `${firstName} ${lastName}`.trim(),
                email: user.email,
                avatarUrl,
                provider: authProvider,
                hasName: !!(firstName || lastName)
            });
            
            const userDetails = {
                    id: user.id,
                    first_name: firstName,
                    last_name: lastName,
                    email: user.email || user.user_metadata?.email,
                    phone: user.user_metadata?.phone || 
                          user.user_metadata?.phone_number || 
                          user.user_metadata?.mobile || null,
                    avatar_url: avatarUrl, // Save social profile picture
                    role: 'user',
                    onboarding_completed: existingProfile?.onboarding_completed || false,
                    profile_completed: existingProfile?.profile_completed || false,
                    created_at: existingProfile?.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString()
            };

            // Upsert profile (create or update with fresh social data)
            console.log(`${existingProfile ? 'Updating' : 'Creating'} profile for social auth user: ${user.id} (mode: ${mode})`);
            console.log('User metadata:', user.user_metadata);
            console.log('App metadata:', user.app_metadata);
            
            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert(userDetails, { onConflict: 'id' });

            if (upsertError) {
                console.error('Profile upsert error:', upsertError);
                // Continue anyway - profile can be created later
            } else {
                console.log(`✅ Profile ${existingProfile ? 'updated' : 'created'} successfully for user: ${user.id}`);
                console.log('📋 Profile details:', {
                    name: `${userDetails.first_name} ${userDetails.last_name}`,
                    email: userDetails.email,
                    provider: user.app_metadata?.provider
                });
            }

            // Store social auth data for dashboard profile
            const socialAuthData = {
                provider: authProvider,
                first_name: firstName,
                last_name: lastName,
                email: userDetails.email,
                phone: userDetails.phone,
                avatar_url: avatarUrl,
                auth_provider: authProvider,
                social_id: user.id,
                created_at: userDetails.created_at,
                updated_at: userDetails.updated_at
            };
            
            console.log('📦 Social auth data being sent to frontend:', socialAuthData);

            // Redirect based on mode with social auth data
            // Frontend is on GitHub Pages with custom domain, backend is on Vercel
            const frontendUrl = process.env.FRONTEND_URL || 'https://zimcrowd.com';
            let redirectUrl;
            
            if (mode === 'signup') {
                // Signup page - always go to onboarding (new or existing user)
                redirectUrl = `${frontendUrl}/onboarding.html?source=social&newUser=true`;
            } else {
                // Signin page - always go directly to dashboard
                redirectUrl = `${frontendUrl}/dashboard.html`;
            }
            
            console.log('🔄 Redirecting to:', redirectUrl, 'Mode:', mode);

            // Send social auth data to frontend via localStorage script
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Redirecting...</title>
                    <script>
                        // Store social auth data in localStorage
                        localStorage.setItem('socialAuthData', JSON.stringify(${JSON.stringify(socialAuthData).replace(/'/g, "\\'")}));
                        localStorage.setItem('socialSignupCompleted', 'true');
                        localStorage.setItem('isAuthenticated', 'true');

                        // Store auth token and user data for dashboard
                        ${data.session?.access_token ? `localStorage.setItem('authToken', '${data.session.access_token}');` : ''}
                        localStorage.setItem('userData', JSON.stringify(${JSON.stringify(socialAuthData).replace(/'/g, "\\'")}));

                        // Redirect to destination
                        window.location.href = '${redirectUrl}';
                    </script>
                </head>
                <body>
                    <p>Redirecting to ${redirectUrl.includes('signup') || redirectUrl.includes('onboarding') ? 'onboarding' : 'dashboard'}...</p>
                </body>
                </html>
            `);
        } else {
            const frontendUrl = process.env.FRONTEND_URL || 'https://zimcrowd.com';
            res.redirect(`${frontendUrl}/login.html?error=no_session`);
        }
    } catch (error) {
        console.error('OAuth callback handler error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'https://zimcrowd.com';
        res.redirect(`${frontendUrl}/login.html?error=callback_error`);
    }
});

// Data deletion callback for Facebook
socialRouter.post('/data-deletion', async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Delete user data from Supabase
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user_id);

        if (profileError) {
            console.error('Profile deletion error:', profileError);
        }

        // Delete related data
        const tables = ['loans', 'investments', 'transactions', 'wallets'];
        for (const table of tables) {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('user_id', user_id);

            if (error) {
                console.error(`${table} deletion error:`, error);
            }
        }

        // Respond to Facebook with confirmation URL
        const confirmationUrl = `${req.protocol}://${req.get('host')}/data-deletion-status?user_id=${user_id}`;

        res.json({
            url: confirmationUrl,
            confirmation_code: `deleted_${user_id}_${Date.now()}`
        });

    } catch (error) {
        console.error('Data deletion error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process data deletion request'
        });
    }
});

// Data deletion status page
socialRouter.get('/data-deletion-status', (req, res) => {
    const { user_id } = req.query;
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Data Deletion Status - ZimCrowd</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: #38e07b; }
            </style>
        </head>
        <body>
            <h1>Data Deletion Completed</h1>
            <p class="success">Your data has been successfully deleted from ZimCrowd.</p>
            <p>User ID: ${user_id}</p>
            <p>If you have any questions, please contact our support team.</p>
        </body>
        </html>
    `);
});

module.exports = socialRouter;
