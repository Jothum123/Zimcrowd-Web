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
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `https://www.zimcrowd.com/dashboard.html`
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
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                redirectTo: `https://www.zimcrowd.com/dashboard.html`
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
            // User is authenticated, redirect to dashboard
            res.redirect('/dashboard');
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
