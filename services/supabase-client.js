/**
 * Shared Supabase Client
 * Safely initializes Supabase only when credentials are available
 */
const { createClient } = require('@supabase/supabase-js');

let supabase = null;
let isInitialized = false;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        isInitialized = true;
        console.log('✅ Shared Supabase client initialized');
    } catch (error) {
        console.warn('⚠️ Failed to initialize Supabase client:', error.message);
    }
} else {
    console.warn('⚠️ Supabase credentials not configured - database features will be limited');
}

/**
 * Get the Supabase client instance
 * @returns {Object|null} Supabase client or null if not configured
 */
function getSupabase() {
    return supabase;
}

/**
 * Check if Supabase is available
 * @returns {boolean} True if Supabase is initialized
 */
function isSupabaseAvailable() {
    return isInitialized && supabase !== null;
}

module.exports = {
    supabase,
    getSupabase,
    isSupabaseAvailable
};
