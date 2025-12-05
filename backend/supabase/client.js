/**
 * Supabase Client Configuration
 * Handles database connections and authentication for salary verification API
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file');
    process.exit(1);
}

// Create Supabase client with service role key for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Database connection test
supabase
    .from('profiles')
    .select('count', { count: 'exact', head: true })
    .then(({ error }) => {
        if (error) {
            console.error('❌ Supabase connection failed:', error.message);
        } else {
            console.log('✅ Supabase connection established successfully');
        }
    })
    .catch(error => {
        console.error('❌ Supabase connection error:', error.message);
    });

module.exports = { supabase };
