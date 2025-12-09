// Supabase Configuration
// Initialize Supabase client for social authentication

// Supabase credentials from .env file
const SUPABASE_CONFIG = {
    URL: 'https://gjtkdrrvnffrmzigdqyp.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdGtkcnJ2bmZmcm16aWdkcXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NzcyMjcsImV4cCI6MjA3ODM1MzIyN30.IlE2yODTRQCl29OlwuZ-CtMxkg1OSPpSEqQVl-X0DtA',
    
    // Get current deployment URL for redirects
    get REDIRECT_URL() {
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' 
                         || hostname === '127.0.0.1'
                         || hostname === '0.0.0.0';
        
        // Admin Portal Check
        if (hostname === 'admin-portal.zimcrowd.com' || hostname.startsWith('admin.')) {
            return `https://${hostname}/admin-login.html`;
        }
        
        if (isLocalhost) {
            return 'http://localhost:3000/dashboard.html';
        } else {
            // Production URL
            return 'https://zimcrowd.com/dashboard.html';
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
