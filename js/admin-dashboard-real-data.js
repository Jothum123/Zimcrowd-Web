// ========================================
// ZIMCROWD ADMIN DASHBOARD - REAL DATA INTEGRATION
// ========================================

const API_KEY_STORAGE = 'zimcrowd_admin_key';
let adminApiKey = localStorage.getItem(API_KEY_STORAGE);

// Authentication Check on Load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    if (adminApiKey) {
        initDashboard();
    }
});

function checkAuth() {
    if (!adminApiKey) {
        const key = prompt('Please enter Admin API Key\n\nDevelopment: admin-dev-key-123');
        if (key) {
            adminApiKey = key;
            localStorage.setItem(API_KEY_STORAGE, key);
            initDashboard();
        } else {
            alert('Admin access required. Reload to try again.');
            document.body.innerHTML = `
                <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;gap:20px;font-family:'Space Grotesk',sans-serif;">
                    <h1>Access Denied</h1>
                    <p>Admin authentication required</p>
                    <button onclick="location.reload()" style="padding:10px 20px;cursor:pointer;background:#667eea;color:white;border:none;border-radius:6px;font-size:14px;">
                        Retry Login
                    </button>
                </div>
            `;
        }
    }
}

// API Helper Function
async function fetchApi(endpoint) {
    try {
        const response = await fetch(`/api/admin-dashboard${endpoint}`, {
            headers: {
                'x-admin-key': adminApiKey,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            localStorage.removeItem(API_KEY_STORAGE);
            alert('Session expired. Please login again.');
            location.reload();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        return null;
    }
}

// Initialize Dashboard
function initDashboard() {
    console.log('🚀 ZimCrowd Admin Dashboard - Live Data Mode');
    console.log('✅ Authentication successful');

    // Load initial data
    fetchDashboardData();

    // Set up auto-refresh every 30 seconds
    setInterval(fetchDashboardData, 30000);
}

// Fetch Dashboard Data
async function fetchDashboardData() {
    updateStatusIndicator('loading');

    try {
        // Parallel data fetching for better performance
        const [overview, userStats, loanStats, aiMetrics, recentActivity] = await Promise.all([
            fetchApi('/overview'),
            fetchApi('/stats/users'),
            fetchApi('/stats/loans'),
            fetchApi('/ai/monitoring'),
            fetchApi('/activity/recent?limit=5')
        ]);

        // Update UI with real data
        if (overview) updateOverview(overview);
        if (userStats) updateUserStats(userStats.data);
        if (loanStats) updateLoanStats(loanStats.data);
        if (aiMetrics) updateAIMetrics(aiMetrics);
        if (recentActivity) updateRecentActivity(recentActivity.data);

        updateStatusIndicator('active');
        console.log('✅ Dashboard data updated successfully');
    } catch (error) {
        console.error('❌ Dashboard update failed:', error);
        updateStatusIndicator('error');
    }
}

// Update Overview Stats
function updateOverview(data) {
    if (!data) return;

    // Update main stat cards
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards[0]) {
        const totalUsersValue = statCards[0].querySelector('.stat-value');
        if (totalUsersValue) totalUsersValue.textContent = (data.totalUsers || 0).toLocaleString();
    }
    if (statCards[1]) {
        const activeLoansValue = statCards[1].querySelector('.stat-value');
        if (activeLoansValue) activeLoansValue.textContent = formatCurrency(data.activeLoansVolume || 0);
    }
    if (statCards[2]) {
        const investmentsValue = statCards[2].querySelector('.stat-value');
        if (investmentsValue) investmentsValue.textContent = formatCurrency(data.totalInvestments || 0);
    }
    if (statCards[3]) {
        const aiConversationsValue = statCards[3].querySelector('.stat-value');
        if (aiConversationsValue) aiConversationsValue.textContent = (data.aiConversations || 0).toLocaleString();
    }
}

// Update User Stats
function updateUserStats(data) {
    if (!data) return;
    console.log('📊 User stats updated:', data);
}

// Update Loan Stats
function updateLoanStats(data) {
    if (!data) return;
    console.log('💰 Loan stats updated:', data);
}

// Update AI Metrics
function updateAIMetrics(data) {
    if (!data) return;

    const metricsContainer = document.querySelector('.ai-metrics');
    if (metricsContainer) {
        metricsContainer.innerHTML = `
            <div class="ai-metric">
                <div class="ai-metric-value">${data.successRate || 0}%</div>
                <div class="ai-metric-label">Success Rate</div>
            </div>
            <div class="ai-metric">
                <div class="ai-metric-value">${(data.totalRequests || 0).toLocaleString()}</div>
                <div class="ai-metric-label">OpenRouter Requests</div>
            </div>
            <div class="ai-metric">
                <div class="ai-metric-value">${(data.fallbackCount || 0).toLocaleString()}</div>
                <div class="ai-metric-label">Gemini Fallbacks</div>
            </div>
            <div class="ai-metric">
                <div class="ai-metric-value">${data.reliability || 0}%</div>
                <div class="ai-metric-label">System Reliability</div>
            </div>
        `;
    }
}

// Update Recent Activity
function updateRecentActivity(activities) {
    if (!activities || !Array.isArray(activities) || activities.length === 0) return;

    const tbody = document.querySelector('.data-table tbody');
    if (tbody) {
        tbody.innerHTML = activities.map(activity => `
            <tr>
                <td>${new Date(activity.timestamp).toLocaleTimeString()}</td>
                <td>${activity.type || 'N/A'}</td>
                <td>${activity.user || 'N/A'}</td>
                <td>${activity.amount ? formatCurrency(activity.amount) : '-'}</td>
                <td><span class="status-badge ${getStatusClass(activity.status)}">${activity.status || 'pending'}</span></td>
                <td><button class="btn btn-primary" onclick="viewActivity('${activity.id}')">View</button></td>
            </tr>
        `).join('');
    }
}

// Helper Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

function getStatusClass(status) {
    if (!status) return 'pending';
    switch (status.toLowerCase()) {
        case 'completed': return 'approved';
        case 'approved': return 'approved';
        case 'pending': return 'pending';
        case 'failed': return 'rejected';
        case 'rejected': return 'rejected';
        default: return 'pending';
    }
}

function updateStatusIndicator(status) {
    const indicator = document.querySelector('.status-indicator');
    const text = document.querySelector('.ai-status-card span');

    if (indicator && text) {
        if (status === 'loading') {
            indicator.style.background = '#f59e0b';
            text.textContent = 'Updating...';
        } else if (status === 'error') {
            indicator.style.background = '#e53e3e';
            text.textContent = 'Connection Error';
        } else {
            indicator.style.background = '#10b981';
            text.textContent = 'Live System Active';
        }
    }
}

function viewActivity(activityId) {
    alert(`Viewing activity: ${activityId}\n\nThis would open detailed activity information.`);
}

// Override refreshData to use real API
window.refreshData = function () {
    fetchDashboardData();
};

// Export functions for user management
window.exportUsers = function () {
    window.open(`/api/admin-dashboard/export/users?key=${adminApiKey}`, '_blank');
};

window.refreshUsers = async function () {
    const data = await fetchApi('/users');
    if (data && data.users) {
        console.log('Users refreshed:', data);
        alert('Users data refreshed successfully!');
    }
};

console.log('📦 Real Data Integration Module Loaded');
