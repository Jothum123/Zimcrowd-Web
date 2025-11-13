// Social authentication routes for Google and Facebook OAuth
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client directly
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const socialRouter = express.Router();

// Google OAuth
socialRouter.get('/google', async (req, res) => {
    try {
        const { mode = 'login' } = req.query; // 'login' or 'signup'
        const redirectTo = mode === 'signup'
            ? `https://www.zimcrowd.com/dashboard.html?mode=signup`
            : `https://www.zimcrowd.com/dashboard.html`;

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectTo
            }
        });

        if (error) {
            console.error('Google OAuth error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to initiate Google authentication'
            });
        }

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
        const redirectTo = mode === 'signup'
            ? `https://www.zimcrowd.com/dashboard.html?mode=signup`
            : `https://www.zimcrowd.com/dashboard.html`;

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                redirectTo: redirectTo
            }
        });

        if (error) {
            console.error('Facebook OAuth error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to initiate Facebook authentication'
            });
        }

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
        // Get the session from the URL hash or query params
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            console.error('OAuth callback error:', error);
            return res.redirect('/login?error=oauth_failed');
        }

        if (data.session) {
            // User is authenticated, check if we need to create/update profile
            const user = data.session.user;
            const { mode } = req.query; // Get mode from query params

            // Check if profile exists
            const { data: existingProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Profile check error:', profileError);
            }

            // If profile doesn't exist and this is a signup, create it
            if (!existingProfile && mode === 'signup') {
                console.log(`Creating profile for new social signup user: ${user.id}`);
                
                // Extract comprehensive user details from social provider
                const userDetails = {
                    first_name: user.user_metadata?.first_name || 
                              user.user_metadata?.given_name || 
                              user.user_metadata?.full_name?.split(' ')[0] || 
                              user.user_metadata?.name?.split(' ')[0] || '',
                    
                    last_name: user.user_metadata?.last_name || 
                             user.user_metadata?.family_name || 
                             user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 
                             user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
                    
                    email: user.email || user.user_metadata?.email,
                    
                    phone: user.user_metadata?.phone || 
                          user.user_metadata?.phone_number || 
                          user.user_metadata?.mobile || null,
                    
                    avatar_url: user.user_metadata?.avatar_url || 
                              user.user_metadata?.picture || 
                              user.user_metadata?.profile_picture || 
                              user.user_metadata?.image_url || null,
                    
                    auth_provider: user.app_metadata?.provider || 'unknown',
                    
                    // Additional social profile data
                    social_id: user.user_metadata?.sub || 
                             user.user_metadata?.id || 
                             user.user_metadata?.user_id || null,
                    
                    social_profile_url: user.user_metadata?.profile || 
                                      user.user_metadata?.link || 
                                      user.user_metadata?.url || null,
                    
                    // Basic profile completion status
                    profile_completed: false, // Will be set to true after comprehensive registration
                    documents_verified: false,
                    employment_verified: false,
                    payment_setup: false,
                    
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert(userDetails);

                if (insertError) {
                    console.error('Profile creation error:', insertError);
                    // Continue anyway - profile can be created later
                } else {
                    console.log(`Profile created successfully for user: ${user.id} with provider: ${userDetails.auth_provider}`);
                    console.log('Captured user details:', {
                        name: `${userDetails.first_name} ${userDetails.last_name}`,
                        email: userDetails.email,
                        provider: userDetails.auth_provider,
                        hasAvatar: !!userDetails.avatar_url
                    });
                }
            }

            // Redirect based on mode
            let redirectUrl;
            if (mode === 'signup') {
                // New signup - go directly to onboarding splash screens
                redirectUrl = '/onboarding.html?source=social';
            } else {
                // Existing login - go to dashboard
                redirectUrl = '/dashboard.html';
            }
                
            res.redirect(redirectUrl);
        } else {
            res.redirect('/login?error=no_session');
        }
    } catch (error) {
        console.error('OAuth callback handler error:', error);
        res.redirect('/login?error=callback_error');
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
