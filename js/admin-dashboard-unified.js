/**
 * ZimCrowd Admin Dashboard - Unified JavaScript
 * Main dashboard functionality with role-based access control
 */

// Global variables
let currentAdmin = null;
let currentSection = 'overview';
let dashboardData = {};
let refreshInterval = null;

// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : 'https://zimcrowd-backend.vercel.app';

const API_ENDPOINTS = {
    // Admin Authentication
    adminProfile: '/api/admin-role-management/profile',
    adminUsers: '/api/admin-role-management/users',
    adminRoles: '/api/admin-role-management/roles',
    adminActivity: '/api/admin-role-management/activity',
    checkPermission: '/api/admin-role-management/check-permission',
    
    // Wallet Management
    walletOverview: '/api/admin-wallet-monitoring/overview',
    walletDeposits: '/api/admin-wallet-monitoring/deposits',
    walletWithdrawals: '/api/admin-wallet-monitoring/withdrawals',
    walletSuspicious: '/api/admin-wallet-monitoring/suspicious',
    
    // Manual Transactions
    manualDeposit: '/api/admin-manual-transactions/deposit',
    manualDebit: '/api/admin-manual-transactions/debit',
    bankTransfer: '/api/admin-manual-transactions/bank-transfer',
    bulkTransactions: '/api/admin-manual-transactions/bulk',
    transactionHistory: '/api/admin-manual-transactions/history',
    userBalance: '/api/admin-manual-transactions/user-balance',
    validateUser: '/api/admin-manual-transactions/validate-user',
    
    // Dashboard Data
    dashboardOverview: '/api/admin-dashboard/overview',
    userStats: '/api/admin-dashboard/users',
    loanStats: '/api/admin-dashboard/loans',
    paymentStats: '/api/admin-dashboard/payments',
    
    // Kairo AI
    kairoChat: '/api/kairo-azure/admin-chat'
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing ZimCrowd Admin Dashboard...');
    initializeDashboard();
});

/**
 * Initialize the dashboard
 */
async function initializeDashboard() {
    try {
        // Show loading screen
        showLoadingScreen();
        
        // Authenticate admin
        const authResult = await authenticateAdmin();
        if (!authResult.success) {
            handleAuthenticationError();
            return;
        }
        
        currentAdmin = authResult.admin;
        
        // Setup UI based on admin role
        setupAdminUI();
        
        // Load initial data
        await loadDashboardData();
        
        // Setup navigation
        setupNavigation();
        
        // Setup auto-refresh
        setupAutoRefresh();
        
        // Show dashboard
        hideLoadingScreen();
        
        console.log('✅ Dashboard initialized successfully');
        
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        showError('Failed to initialize dashboard: ' + error.message);
    }
}

/**
 * Authenticate admin user
 */
async function authenticateAdmin() {
    try {
        const apiKey = localStorage.getItem('admin_api_key') || 'admin-dev-key-123';
        
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.adminProfile, {
            method: 'GET',
            headers: {
                'x-admin-key': apiKey,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Authentication failed');
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('❌ Authentication error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Setup admin UI based on role and permissions
 */
function setupAdminUI() {
    if (!currentAdmin) return;
    
    // Update admin profile display
    document.getElementById('adminName').textContent = currentAdmin.name;
    document.getElementById('adminRole').textContent = currentAdmin.role_display;
    
    // Show/hide navigation sections based on permissions
    setupRoleBasedNavigation();
    
    console.log(`👤 Admin UI setup for: ${currentAdmin.name} (${currentAdmin.role})`);
}

/**
 * Setup role-based navigation
 */
function setupRoleBasedNavigation() {
    const permissions = currentAdmin.permissions || [];
    
    // Financial section
    const financialSection = document.getElementById('financialSection');
    if (!hasAnyPermission(['finance.view', 'wallet.view', 'transactions.view'])) {
        financialSection.style.display = 'none';
    }
    
    // User section
    const userSection = document.getElementById('userSection');
    if (!hasAnyPermission(['users.view', 'kyc.view'])) {
        userSection.style.display = 'none';
    }
    
    // Loan section
    const loanSection = document.getElementById('loanSection');
    if (!hasAnyPermission(['loans.view'])) {
        loanSection.style.display = 'none';
    }
    
    // System section
    const systemSection = document.getElementById('systemSection');
    if (!hasAnyPermission(['system.admin_users', 'system.audit_logs', 'system.settings'])) {
        systemSection.style.display = 'none';
    }
}

/**
 * Check if admin has any of the specified permissions
 */
function hasAnyPermission(permissionList) {
    if (!currentAdmin || !currentAdmin.permissions) return false;
    if (currentAdmin.role === 'super_admin') return true;
    
    return permissionList.some(permission => 
        currentAdmin.permissions.includes(permission)
    );
}

/**
 * Check if admin has specific permission
 */
function hasPermission(permission) {
    if (!currentAdmin || !currentAdmin.permissions) return false;
    if (currentAdmin.role === 'super_admin') return true;
    
    return currentAdmin.permissions.includes(permission);
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    try {
        console.log('📊 Loading dashboard data...');
        
        // Load overview data
        await loadOverviewData();
        
        // Load section-specific data based on current section
        await loadSectionData(currentSection);
        
        // Update header stats
        updateHeaderStats();
        
        console.log('✅ Dashboard data loaded');
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

/**
 * Load overview data
 */
async function loadOverviewData() {
    try {
        const response = await makeAuthenticatedRequest(API_ENDPOINTS.dashboardOverview);
        if (response.success) {
            dashboardData.overview = response.data;
        }
    } catch (error) {
        console.error('❌ Error loading overview data:', error);
    }
}

/**
 * Load section-specific data
 */
async function loadSectionData(section) {
    switch (section) {
        case 'wallet-monitoring':
            await loadWalletData();
            break;
        case 'manual-transactions':
            await loadTransactionData();
            break;
        case 'users':
            await loadUserData();
            break;
        case 'admin-users':
            await loadAdminUserData();
            break;
        default:
            break;
    }
}

/**
 * Load wallet monitoring data
 */
async function loadWalletData() {
    if (!hasPermission('wallet.view')) return;
    
    try {
        const response = await makeAuthenticatedRequest(API_ENDPOINTS.walletOverview);
        if (response.success) {
            dashboardData.wallet = response.data;
            updateSuspiciousCount(response.data.suspicious_activity?.length || 0);
        }
    } catch (error) {
        console.error('❌ Error loading wallet data:', error);
    }
}

/**
 * Load transaction data
 */
async function loadTransactionData() {
    if (!hasPermission('finance.view')) return;
    
    try {
        const response = await makeAuthenticatedRequest(API_ENDPOINTS.transactionHistory + '?limit=10');
        if (response.success) {
            dashboardData.transactions = response.data;
        }
    } catch (error) {
        console.error('❌ Error loading transaction data:', error);
    }
}

/**
 * Load user data
 */
async function loadUserData() {
    if (!hasPermission('users.view')) return;
    
    try {
        const response = await makeAuthenticatedRequest(API_ENDPOINTS.userStats);
        if (response.success) {
            dashboardData.users = response.data;
        }
    } catch (error) {
        console.error('❌ Error loading user data:', error);
    }
}

/**
 * Load admin user data
 */
async function loadAdminUserData() {
    if (!hasPermission('system.admin_users')) return;
    
    try {
        const response = await makeAuthenticatedRequest(API_ENDPOINTS.adminUsers);
        if (response.success) {
            dashboardData.adminUsers = response.data;
        }
    } catch (error) {
        console.error('❌ Error loading admin user data:', error);
    }
}

/**
 * Make authenticated API request
 */
async function makeAuthenticatedRequest(endpoint, options = {}) {
    const apiKey = localStorage.getItem('admin_api_key') || 'admin-dev-key-123';
    
    const defaultOptions = {
        method: 'GET',
        headers: {
            'x-admin-key': apiKey,
            'Content-Type': 'application/json'
        }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    const response = await fetch(API_BASE_URL + endpoint, finalOptions);
    
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
}

/**
 * Setup navigation
 */
function setupNavigation() {
    // Add click handlers to nav items
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.closest('.nav-item').dataset.section;
            if (section) {
                showSection(section);
            }
        });
    });
}

/**
 * Show specific section
 */
async function showSection(sectionName) {
    try {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
        
        // Update breadcrumb
        updateBreadcrumb(sectionName);
        
        // Load section content
        await loadSectionContent(sectionName);
        
        currentSection = sectionName;
        
        console.log(`📄 Switched to section: ${sectionName}`);
        
    } catch (error) {
        console.error('❌ Error showing section:', error);
        showError('Failed to load section');
    }
}

/**
 * Load section content
 */
async function loadSectionContent(sectionName) {
    const contentArea = document.getElementById('adminContent');
    
    // Show loading
    contentArea.innerHTML = '<div class="loading-content"><div class="loading-spinner"></div><p>Loading...</p></div>';
    
    // Load section data
    await loadSectionData(sectionName);
    
    // Render section content
    switch (sectionName) {
        case 'overview':
            renderOverviewSection();
            break;
        case 'wallet-monitoring':
            renderWalletMonitoringSection();
            break;
        case 'manual-transactions':
            renderManualTransactionsSection();
            break;
        case 'users':
            renderUsersSection();
            break;
        case 'admin-users':
            renderAdminUsersSection();
            break;
        default:
            renderDefaultSection(sectionName);
            break;
    }
}

/**
 * Render overview section
 */
function renderOverviewSection() {
    const contentArea = document.getElementById('adminContent');
    const data = dashboardData.overview || {};
    
    contentArea.innerHTML = `
        <div class="section-header">
            <h1>Dashboard Overview</h1>
            <p>Welcome back, ${currentAdmin.name}! Here's your system overview.</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-content">
                    <h3>${data.total_users || 0}</h3>
                    <p>Total Users</p>
                    <span class="stat-change positive">+${data.new_users_today || 0} today</span>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="stat-content">
                    <h3>$${formatNumber(data.total_revenue || 0)}</h3>
                    <p>Total Revenue</p>
                    <span class="stat-change positive">+$${formatNumber(data.revenue_today || 0)} today</span>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-exchange-alt"></i>
                </div>
                <div class="stat-content">
                    <h3>${data.total_transactions || 0}</h3>
                    <p>Transactions</p>
                    <span class="stat-change neutral">${data.transactions_today || 0} today</span>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-hand-holding-usd"></i>
                </div>
                <div class="stat-content">
                    <h3>${data.active_loans || 0}</h3>
                    <p>Active Loans</p>
                    <span class="stat-change warning">${data.pending_loans || 0} pending</span>
                </div>
            </div>
        </div>
        
        <div class="dashboard-grid">
            <div class="dashboard-card">
                <div class="card-header">
                    <h3>Recent Activity</h3>
                    <button onclick="refreshActivity()">
                        <i class="fas fa-sync"></i>
                    </button>
                </div>
                <div class="card-content">
                    <div id="recentActivity">Loading...</div>
                </div>
            </div>
            
            <div class="dashboard-card">
                <div class="card-header">
                    <h3>System Status</h3>
                </div>
                <div class="card-content">
                    <div class="status-item">
                        <span>API Server</span>
                        <span class="status-badge online">Online</span>
                    </div>
                    <div class="status-item">
                        <span>Database</span>
                        <span class="status-badge online">Connected</span>
                    </div>
                    <div class="status-item">
                        <span>Payment Gateway</span>
                        <span class="status-badge online">Active</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load recent activity
    loadRecentActivity();
}

/**
 * Update header stats
 */
function updateHeaderStats() {
    const data = dashboardData.overview || {};
    
    document.getElementById('totalUsers').textContent = data.total_users || 0;
    document.getElementById('totalRevenue').textContent = '$' + formatNumber(data.total_revenue || 0);
}

/**
 * Update suspicious activity count
 */
function updateSuspiciousCount(count) {
    const badge = document.getElementById('suspiciousCount');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    }
}

/**
 * Update breadcrumb
 */
function updateBreadcrumb(sectionName) {
    const sectionNames = {
        'overview': 'Overview',
        'analytics': 'Analytics',
        'wallet-monitoring': 'Wallet Monitoring',
        'manual-transactions': 'Manual Transactions',
        'transaction-history': 'Transaction History',
        'financial-reports': 'Financial Reports',
        'users': 'User Management',
        'kyc-review': 'KYC Review',
        'account-status': 'Account Status',
        'loans': 'Loan Management',
        'loan-applications': 'Loan Applications',
        'admin-users': 'Admin Users',
        'audit-logs': 'Audit Logs',
        'system-settings': 'System Settings'
    };
    
    document.getElementById('currentSection').textContent = 'Dashboard';
    document.getElementById('currentSubSection').textContent = sectionNames[sectionName] || sectionName;
}

/**
 * Setup auto-refresh
 */
function setupAutoRefresh() {
    // Refresh every 30 seconds
    refreshInterval = setInterval(() => {
        loadDashboardData();
    }, 30000);
}

/**
 * Utility functions
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function showLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'flex';
    document.getElementById('adminContainer').style.display = 'none';
}

function hideLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('adminContainer').style.display = 'flex';
}

function showError(message) {
    console.error('❌ Error:', message);
    // You can implement a toast notification system here
    alert('Error: ' + message);
}

function handleAuthenticationError() {
    showError('Authentication failed. Please check your credentials.');
    // Redirect to login page or show login modal
}

/**
 * UI Interaction Functions
 */
function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    sidebar.classList.toggle('open');
}

function showAdminProfile() {
    // Show admin profile modal
    console.log('👤 Show admin profile');
}

function logout() {
    localStorage.removeItem('admin_api_key');
    window.location.reload();
}

function showNotifications() {
    console.log('🔔 Show notifications');
}

// Export functions for global access
window.showSection = showSection;
window.toggleSidebar = toggleSidebar;
window.showAdminProfile = showAdminProfile;
window.logout = logout;
window.showNotifications = showNotifications;
