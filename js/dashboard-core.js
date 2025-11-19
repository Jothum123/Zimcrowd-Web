/**
 * ZimCrowd Dashboard Core
 * Handles authentication, navigation, and core functionality
 */

// API Configuration
const API_CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api'
        : 'https://zimcrowd-backend.vercel.app/api',
    
    get HEADERS() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }
};

// Global State
const DashboardState = {
    user: null,
    currentSection: 'overview',
    data: {
        stats: null,
        loans: [],
        investments: [],
        transactions: [],
        wallet: null,
        referrals: null
    }
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing ZimCrowd Dashboard...');
    
    try {
        // Check authentication
        if (!checkAuth()) {
            console.log('❌ Authentication failed, redirecting to login');
            redirectToLogin();
            return;
        }
        
        console.log('✅ Authentication passed');
        
        // Load user data
        await loadUserData();
        
        // Initialize navigation
        initializeNavigation();
        
        // Initialize event listeners
        initializeEventListeners();
        
        // Load initial section
        await loadSection('overview');
        
        console.log('✅ Dashboard initialized successfully');
    } catch (error) {
        console.error('❌ Dashboard initialization error:', error);
        // Don't redirect on error, just log it
    }
});

// Authentication
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (!token || !userData) {
        return false;
    }
    
    try {
        DashboardState.user = JSON.parse(userData);
        return true;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return false;
    }
}

function redirectToLogin() {
    window.location.href = '/login.html';
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('isAuthenticated');
    redirectToLogin();
}

// Load User Data
async function loadUserData() {
    try {
        const user = DashboardState.user;
        console.log('📝 Loading user data:', user);
        
        // Update UI with user info (with null checks)
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.textContent = user.first_name || user.fullName || user.email || 'User';
        }
        
        // Set avatar initial
        const userAvatarEl = document.getElementById('userAvatar');
        if (userAvatarEl) {
            const initial = (user.first_name || user.fullName || user.email || 'U')[0].toUpperCase();
            userAvatarEl.textContent = initial;
        }
        
        // Load notifications count
        await loadNotificationsCount();
        
    } catch (error) {
        console.error('Error loading user data:', error);
        // Don't throw, just log the error
    }
}

async function loadNotificationsCount() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/dashboard/notifications?unread=true`, {
            headers: API_CONFIG.HEADERS
        });
        
        if (response.ok) {
            const data = await response.json();
            const count = data.data?.unread_count || 0;
            document.getElementById('notificationCount').textContent = count;
            
            if (count === 0) {
                document.getElementById('notificationCount').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Navigation
function initializeNavigation() {
    // Header navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            if (section) {
                showSection(section);
            }
        });
    });
    
    // Quick action buttons
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            handleQuickAction(action);
        });
    });
    
    // Section navigation buttons
    document.querySelectorAll('[data-section]').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            if (section) {
                showSection(section);
            }
        });
    });
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        DashboardState.currentSection = sectionName;
        
        // Update navigation active state
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === sectionName) {
                btn.classList.add('active');
            }
        });
        
        // Load section data
        loadSection(sectionName);
    }
}

async function loadSection(sectionName) {
    console.log(`Loading section: ${sectionName}`);
    
    switch(sectionName) {
        case 'overview':
            await loadOverviewSection();
            break;
        case 'loans':
            if (window.LoansModule) {
                await window.LoansModule.loadLoans();
            }
            break;
        case 'wallet':
            if (window.WalletModule) {
                await window.WalletModule.loadWallet();
            }
            break;
        case 'investments':
            if (window.InvestmentsModule) {
                await window.InvestmentsModule.loadInvestments();
            }
            break;
        case 'transactions':
            if (window.TransactionsModule) {
                await window.TransactionsModule.loadTransactions();
            }
            break;
        case 'referrals':
            if (window.ReferralsModule) {
                await window.ReferralsModule.loadReferrals();
            }
            break;
        case 'settings':
            if (window.SettingsModule) {
                await window.SettingsModule.loadSettings();
            }
            break;
    }
}

// Overview Section
async function loadOverviewSection() {
    try {
        // Load stats
        await loadDashboardStats();
        
        // Load recent activity
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error loading overview:', error);
    }
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/dashboard/stats`, {
            headers: API_CONFIG.HEADERS
        });
        
        if (response.ok) {
            const result = await response.json();
            const stats = result.data;
            
            // Update wallet balance
            document.getElementById('walletBalance').textContent = 
                `$${(stats.wallet_balance || 0).toFixed(2)}`;
            
            // Update active loans
            document.getElementById('activeLoans').textContent = stats.active_loans || 0;
            document.getElementById('loanAmount').textContent = 
                `$${(stats.total_loan_amount || 0).toFixed(2)}`;
            
            // Update investments
            document.getElementById('investmentValue').textContent = 
                `$${(stats.investment_value || 0).toFixed(2)}`;
            document.getElementById('investmentReturn').textContent = 
                `${(stats.investment_return || 0).toFixed(1)}%`;
            
            // Update ZimScore
            document.getElementById('zimScore').textContent = stats.zim_score || 0;
            document.getElementById('scoreChange').textContent = 
                `+${stats.score_change || 0}`;
            
            DashboardState.data.stats = stats;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRecentActivity() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/dashboard/transactions?limit=5`, {
            headers: API_CONFIG.HEADERS
        });
        
        if (response.ok) {
            const result = await response.json();
            const transactions = result.data?.transactions || [];
            
            const activityContainer = document.getElementById('recentActivity');
            
            if (transactions.length === 0) {
                activityContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                        <p>No recent activity</p>
                    </div>
                `;
                return;
            }
            
            activityContainer.innerHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(tx => `
                            <tr>
                                <td>${new Date(tx.created_at).toLocaleDateString()}</td>
                                <td>${tx.type}</td>
                                <td>$${tx.amount.toFixed(2)}</td>
                                <td><span class="badge ${getStatusBadgeClass(tx.status)}">${tx.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// Quick Actions
function handleQuickAction(action) {
    switch(action) {
        case 'request-loan':
            showSection('loans');
            if (window.LoansModule) {
                window.LoansModule.showRequestLoanModal();
            }
            break;
        case 'add-funds':
            showSection('wallet');
            if (window.WalletModule) {
                window.WalletModule.showAddFundsModal();
            }
            break;
        case 'invest':
            showSection('investments');
            if (window.InvestmentsModule) {
                window.InvestmentsModule.showInvestModal();
            }
            break;
    }
}

// Event Listeners
function initializeEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Notification button
    document.getElementById('notificationBtn').addEventListener('click', toggleNotifications);
}

function toggleNotifications() {
    // TODO: Implement notifications panel
    console.log('Toggle notifications');
}

// Utility Functions
function getStatusBadgeClass(status) {
    const statusMap = {
        'completed': 'success',
        'pending': 'warning',
        'failed': 'danger',
        'active': 'info'
    };
    return statusMap[status?.toLowerCase()] || 'info';
}

function formatCurrency(amount) {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showError(message) {
    // TODO: Implement toast notification
    alert(message);
}

function showSuccess(message) {
    // TODO: Implement toast notification
    alert(message);
}

// Export for use in other modules
window.DashboardCore = {
    API_CONFIG,
    DashboardState,
    showSection,
    loadSection,
    formatCurrency,
    formatDate,
    showError,
    showSuccess,
    getStatusBadgeClass
};

console.log('✅ Dashboard Core loaded');
