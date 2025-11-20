// Supabase Configuration
// Initialize Supabase client for social authentication

// Supabase configuration
const SUPABASE_CONFIG = {
    URL: 'https://your-project.supabase.co', // Replace with your Supabase URL
    ANON_KEY: 'your-anon-key', // Replace with your Supabase anon key
    
    // Get current deployment URL for redirects
    get REDIRECT_URL() {
        const isLocalhost = window.location.hostname === 'localhost' 
                         || window.location.hostname === '127.0.0.1'
                         || window.location.hostname === '0.0.0.0';
        
        if (isLocalhost) {
            return 'http://localhost:3000/dashboard.html';
        } else {
            return `${window.location.origin}/dashboard.html`;
        }
    }
};

// Initialize Supabase client
let supabaseClient;

try {
    if (typeof window !== 'undefined' && window.supabase) {
        supabaseClient = window.supabase.createClient(
            SUPABASE_CONFIG.URL, 
            SUPABASE_CONFIG.ANON_KEY
        );
        console.log('✅ Supabase client initialized');
    } else {
        console.warn('⚠️ Supabase library not loaded');
    }
} catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
}

// Export for use in other files
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.supabaseClient = supabaseClient;
