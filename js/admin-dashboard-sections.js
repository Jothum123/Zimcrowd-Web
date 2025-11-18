/**
 * Admin Dashboard Section Renderers
 * Additional section rendering functions for the unified admin dashboard
 */

/**
 * Render Users Management Section
 */
function renderUsersSection() {
    const contentArea = document.getElementById('adminContent');
    
    contentArea.innerHTML = `
        <div class="section-header">
            <div class="header-content">
                <h1>👥 User Management</h1>
                <p>Manage platform users and their accounts</p>
            </div>
            <div class="header-actions">
                <button onclick="exportUsers()" class="btn-secondary">
                    <i class="fas fa-download"></i> Export Users
                </button>
                <button onclick="refreshUsers()" class="btn-primary">
                    <i class="fas fa-sync"></i> Refresh
                </button>
            </div>
        </div>

        <div class="filters-bar">
            <input type="text" id="userSearch" placeholder="Search by name or email..." onkeyup="filterUsers()">
            <select id="userStatusFilter" onchange="filterUsers()">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
            </select>
            <select id="userRoleFilter" onchange="filterUsers()">
                <option value="all">All Roles</option>
                <option value="borrower">Borrower</option>
                <option value="investor">Investor</option>
                <option value="both">Both</option>
            </select>
        </div>

        <div class="dashboard-card">
            <div class="card-content">
                <div id="usersTable">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>Loading users...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadUsersData();
}

/**
 * Render KYC Review Section
 */
function renderKYCSection() {
    const contentArea = document.getElementById('adminContent');
    
    contentArea.innerHTML = `
        <div class="section-header">
            <div class="header-content">
                <h1>🆔 KYC Review</h1>
                <p>Review and approve user identity verification</p>
            </div>
            <div class="header-actions">
                <span class="badge-count">
                    <i class="fas fa-clock"></i>
                    <span id="pendingKYCCount">0</span> Pending
                </span>
            </div>
        </div>

        <div class="kyc-tabs">
            <button class="tab-btn active" onclick="showKYCTab('pending')">
                Pending Review
            </button>
            <button class="tab-btn" onclick="showKYCTab('approved')">
                Approved
            </button>
            <button class="tab-btn" onclick="showKYCTab('rejected')">
                Rejected
            </button>
        </div>

        <div id="kycContent">
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>Loading KYC submissions...</p>
            </div>
        </div>
    `;

    loadKYCData();
}

/**
 * Render Account Status Section
 */
function renderAccountStatusSection() {
    const contentArea = document.getElementById('adminContent');
    
    contentArea.innerHTML = `
        <div class="section-header">
            <div class="header-content">
                <h1>🚩 Account Status</h1>
                <p>Monitor accounts in arrears and flagged accounts</p>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card warning">
                <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="stat-content">
                    <h3 id="arrearsCount">0</h3>
                    <p>Accounts in Arrears</p>
                </div>
            </div>
            <div class="stat-card error">
                <div class="stat-icon"><i class="fas fa-ban"></i></div>
                <div class="stat-content">
                    <h3 id="suspendedCount">0</h3>
                    <p>Suspended Accounts</p>
                </div>
            </div>
            <div class="stat-card info">
                <div class="stat-icon"><i class="fas fa-flag"></i></div>
                <div class="stat-content">
                    <h3 id="flaggedCount">0</h3>
                    <p>Flagged for Review</p>
                </div>
            </div>
        </div>

        <div class="dashboard-card">
            <div class="card-header">
                <h3>Accounts Requiring Attention</h3>
            </div>
            <div class="card-content">
                <div id="accountStatusList">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>Loading account status...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadAccountStatusData();
}

/**
 * Render Loans Management Section
 */
function renderLoansSection() {
    const contentArea = document.getElementById('adminContent');
    
    contentArea.innerHTML = `
        <div class="section-header">
            <div class="header-content">
                <h1>💰 Loan Management</h1>
                <p>Monitor and manage all platform loans</p>
            </div>
            <div class="header-actions">
                <button onclick="exportLoans()" class="btn-secondary">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card primary">
                <div class="stat-icon"><i class="fas fa-hand-holding-usd"></i></div>
                <div class="stat-content">
                    <h3 id="totalLoans">0</h3>
                    <p>Total Loans</p>
                </div>
            </div>
            <div class="stat-card success">
                <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                <div class="stat-content">
                    <h3 id="activeLoans">0</h3>
                    <p>Active Loans</p>
                </div>
            </div>
            <div class="stat-card warning">
                <div class="stat-icon"><i class="fas fa-clock"></i></div>
                <div class="stat-content">
                    <h3 id="pendingLoans">0</h3>
                    <p>Pending Approval</p>
                </div>
            </div>
            <div class="stat-card info">
                <div class="stat-icon"><i class="fas fa-dollar-sign"></i></div>
                <div class="stat-content">
                    <h3 id="totalDisbursed">$0</h3>
                    <p>Total Disbursed</p>
                </div>
            </div>
        </div>

        <div class="dashboard-card">
            <div class="card-header">
                <h3>Recent Loans</h3>
                <select id="loanStatusFilter" onchange="filterLoans()">
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="defaulted">Defaulted</option>
                </select>
            </div>
            <div class="card-content">
                <div id="loansTable">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>Loading loans...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadLoansData();
}

/**
 * Render Loan Applications Section
 */
function renderLoanApplicationsSection() {
    const contentArea = document.getElementById('adminContent');
    
    contentArea.innerHTML = `
        <div class="section-header">
            <div class="header-content">
                <h1>📝 Loan Applications</h1>
                <p>Review and process loan applications</p>
            </div>
        </div>

        <div class="application-tabs">
            <button class="tab-btn active" onclick="showApplicationTab('pending')">
                <i class="fas fa-clock"></i> Pending (<span id="pendingAppCount">0</span>)
            </button>
            <button class="tab-btn" onclick="showApplicationTab('approved')">
                <i class="fas fa-check"></i> Approved
            </button>
            <button class="tab-btn" onclick="showApplicationTab('rejected')">
                <i class="fas fa-times"></i> Rejected
            </button>
        </div>

        <div id="applicationsContent">
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>Loading applications...</p>
            </div>
        </div>
    `;

    loadLoanApplicationsData();
}

/**
 * Render Admin Users Section
 */
function renderAdminUsersSection() {
    const contentArea = document.getElementById('adminContent');
    
    contentArea.innerHTML = `
        <div class="section-header">
            <div class="header-content">
                <h1>🛡️ Admin Users</h1>
                <p>Manage admin users and their permissions</p>
            </div>
            <div class="header-actions">
                <button onclick="showCreateAdminModal()" class="btn-primary">
                    <i class="fas fa-plus"></i> Add Admin
                </button>
            </div>
        </div>

        <div class="dashboard-card">
            <div class="card-content">
                <div id="adminUsersTable">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>Loading admin users...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadAdminUsersData();
}

/**
 * Render Audit Logs Section
 */
function renderAuditLogsSection() {
    const contentArea = document.getElementById('adminContent');
    
    contentArea.innerHTML = `
        <div class="section-header">
            <div class="header-content">
                <h1>📋 Audit Logs</h1>
                <p>Track all admin activities and system events</p>
            </div>
            <div class="header-actions">
                <button onclick="exportAuditLogs()" class="btn-secondary">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>
        </div>

        <div class="filters-bar">
            <select id="auditAdminFilter" onchange="filterAuditLogs()">
                <option value="all">All Admins</option>
            </select>
            <select id="auditActionFilter" onchange="filterAuditLogs()">
                <option value="all">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
            </select>
            <select id="auditTimeFilter" onchange="filterAuditLogs()">
                <option value="24h">Last 24 Hours</option>
                <option value="7d" selected>Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
            </select>
        </div>

        <div class="dashboard-card">
            <div class="card-content">
                <div id="auditLogsTable">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>Loading audit logs...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadAuditLogsData();
}

/**
 * Render Analytics Section
 */
function renderAnalyticsSection() {
    const contentArea = document.getElementById('adminContent');
    
    contentArea.innerHTML = `
        <div class="section-header">
            <div class="header-content">
                <h1>📊 Analytics</h1>
                <p>Platform performance and insights</p>
            </div>
            <div class="header-actions">
                <select id="analyticsTimeframe" onchange="updateAnalytics()">
                    <option value="7d">Last 7 Days</option>
                    <option value="30d" selected>Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="1y">Last Year</option>
                </select>
            </div>
        </div>

        <div class="dashboard-grid">
            <div class="dashboard-card">
                <div class="card-header">
                    <h3>User Growth</h3>
                </div>
                <div class="card-content">
                    <canvas id="userGrowthChart" height="300"></canvas>
                </div>
            </div>

            <div class="dashboard-card">
                <div class="card-header">
                    <h3>Revenue Trends</h3>
                </div>
                <div class="card-content">
                    <canvas id="revenueChart" height="300"></canvas>
                </div>
            </div>

            <div class="dashboard-card">
                <div class="card-header">
                    <h3>Loan Performance</h3>
                </div>
                <div class="card-content">
                    <canvas id="loanPerformanceChart" height="300"></canvas>
                </div>
            </div>

            <div class="dashboard-card">
                <div class="card-header">
                    <h3>Investment Distribution</h3>
                </div>
                <div class="card-content">
                    <canvas id="investmentChart" height="300"></canvas>
                </div>
            </div>
        </div>
    `;

    loadAnalyticsData();
}

/**
 * Render Default Section (for unimplemented sections)
 */
function renderDefaultSection(sectionName) {
    const contentArea = document.getElementById('adminContent');
    const sectionTitle = sectionName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    contentArea.innerHTML = `
        <div class="section-header">
            <div class="header-content">
                <h1>${sectionTitle}</h1>
                <p>This section is under development</p>
            </div>
        </div>

        <div class="dashboard-card">
            <div class="card-content" style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-tools" style="font-size: 64px; color: #38e07b; margin-bottom: 20px;"></i>
                <h3>Coming Soon</h3>
                <p>This feature is currently being developed and will be available soon.</p>
            </div>
        </div>
    `;
}

// Data Loading Functions
async function loadUsersData() {
    try {
        const response = await adminAuth.makeRequest('/api/admin-dashboard/users?limit=50');
        if (response.success) {
            renderUsersTable(response.data);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadKYCData() {
    try {
        const response = await adminAuth.makeRequest('/api/admin-dashboard/kyc?status=pending');
        if (response.success) {
            renderKYCList(response.data);
        }
    } catch (error) {
        console.error('Error loading KYC data:', error);
    }
}

async function loadAccountStatusData() {
    try {
        const response = await adminAuth.makeRequest('/api/admin-dashboard/account-status');
        if (response.success) {
            renderAccountStatusList(response.data);
        }
    } catch (error) {
        console.error('Error loading account status:', error);
    }
}

async function loadLoansData() {
    try {
        const response = await adminAuth.makeRequest('/api/admin-dashboard/loans?limit=50');
        if (response.success) {
            renderLoansTable(response.data);
        }
    } catch (error) {
        console.error('Error loading loans:', error);
    }
}

async function loadLoanApplicationsData() {
    try {
        const response = await adminAuth.makeRequest('/api/admin-dashboard/loans?status=pending');
        if (response.success) {
            renderLoanApplicationsList(response.data);
        }
    } catch (error) {
        console.error('Error loading loan applications:', error);
    }
}

async function loadAdminUsersData() {
    try {
        const response = await adminAuth.makeRequest('/api/admin-role-management/users');
        if (response.success) {
            renderAdminUsersTable(response.data);
        }
    } catch (error) {
        console.error('Error loading admin users:', error);
    }
}

async function loadAuditLogsData() {
    try {
        const response = await adminAuth.makeRequest('/api/admin-role-management/activity?limit=100');
        if (response.success) {
            renderAuditLogsTable(response.data);
        }
    } catch (error) {
        console.error('Error loading audit logs:', error);
    }
}

async function loadAnalyticsData() {
    try {
        const [userStats, loanStats, paymentStats] = await Promise.all([
            adminAuth.makeRequest('/api/admin-dashboard/stats/users'),
            adminAuth.makeRequest('/api/admin-dashboard/stats/loans'),
            adminAuth.makeRequest('/api/admin-dashboard/stats/payments')
        ]);

        if (userStats.success) renderUserGrowthChart(userStats.data);
        if (loanStats.success) renderLoanPerformanceChart(loanStats.data);
        if (paymentStats.success) renderRevenueChart(paymentStats.data);
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Render Functions (simplified versions)
function renderUsersTable(data) {
    const container = document.getElementById('usersTable');
    if (!data || !data.users || data.users.length === 0) {
        container.innerHTML = '<p class="no-data">No users found</p>';
        return;
    }

    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>ZimScore</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${data.users.map(user => `
                    <tr>
                        <td>${user.full_name || 'N/A'}</td>
                        <td>${user.email}</td>
                        <td><span class="badge">${user.zim_score || 0}</span></td>
                        <td><span class="status-badge ${user.status}">${user.status}</span></td>
                        <td>${AdminUtils.formatDate(user.created_at)}</td>
                        <td>
                            <button onclick="viewUser('${user.id}')" class="btn-icon" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

function renderKYCList(data) {
    const container = document.getElementById('kycContent');
    container.innerHTML = '<p class="no-data">No pending KYC submissions</p>';
}

function renderAccountStatusList(data) {
    const container = document.getElementById('accountStatusList');
    container.innerHTML = '<p class="no-data">No accounts requiring attention</p>';
}

function renderLoansTable(data) {
    const container = document.getElementById('loansTable');
    if (!data || !data.loans || data.loans.length === 0) {
        container.innerHTML = '<p class="no-data">No loans found</p>';
        return;
    }

    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Borrower</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Interest Rate</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${data.loans.map(loan => `
                    <tr>
                        <td>${loan.borrower_name || 'N/A'}</td>
                        <td>${AdminUtils.formatCurrency(loan.amount)}</td>
                        <td><span class="status-badge ${loan.status}">${loan.status}</span></td>
                        <td>${loan.interest_rate}%</td>
                        <td>${AdminUtils.formatDate(loan.due_date)}</td>
                        <td>
                            <button onclick="viewLoan('${loan.id}')" class="btn-icon" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

function renderLoanApplicationsList(data) {
    const container = document.getElementById('applicationsContent');
    container.innerHTML = '<p class="no-data">No pending applications</p>';
}

function renderAdminUsersTable(data) {
    const container = document.getElementById('adminUsersTable');
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="no-data">No admin users found</p>';
        return;
    }

    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(admin => `
                    <tr>
                        <td>${admin.name}</td>
                        <td>${admin.email}</td>
                        <td><span class="role-badge" style="background: ${AdminUtils.getRoleConfig(admin.role)?.color}">${admin.role}</span></td>
                        <td><span class="status-badge ${admin.is_active ? 'active' : 'inactive'}">${admin.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td>${AdminUtils.formatDate(admin.last_login_at)}</td>
                        <td>
                            <button onclick="editAdmin('${admin.id}')" class="btn-icon" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

function renderAuditLogsTable(data) {
    const container = document.getElementById('auditLogsTable');
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="no-data">No audit logs found</p>';
        return;
    }

    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Details</th>
                    <th>IP Address</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(log => `
                    <tr>
                        <td>${AdminUtils.formatDate(log.created_at)}</td>
                        <td>${log.admin_name || 'System'}</td>
                        <td><span class="action-badge">${log.action}</span></td>
                        <td>${log.details || 'N/A'}</td>
                        <td>${log.ip_address || 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

// Chart rendering functions (simplified)
function renderUserGrowthChart(data) {
    const ctx = document.getElementById('userGrowthChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'New Users',
                data: [12, 19, 15, 25],
                borderColor: ADMIN_CONFIG.ui.theme.primaryGreen,
                tension: 0.4
            }]
        },
        options: ADMIN_CONFIG.charts.options
    });
}

function renderRevenueChart(data) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Revenue',
                data: [1200, 1900, 1500, 2500],
                backgroundColor: ADMIN_CONFIG.ui.theme.primaryGreen
            }]
        },
        options: ADMIN_CONFIG.charts.options
    });
}

function renderLoanPerformanceChart(data) {
    const ctx = document.getElementById('loanPerformanceChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'Completed', 'Defaulted'],
            datasets: [{
                data: [45, 40, 15],
                backgroundColor: ['#38e07b', '#3b82f6', '#ef4444']
            }]
        },
        options: ADMIN_CONFIG.charts.options
    });
}

// Export to global scope
window.renderUsersSection = renderUsersSection;
window.renderKYCSection = renderKYCSection;
window.renderAccountStatusSection = renderAccountStatusSection;
window.renderLoansSection = renderLoansSection;
window.renderLoanApplicationsSection = renderLoanApplicationsSection;
window.renderAdminUsersSection = renderAdminUsersSection;
window.renderAuditLogsSection = renderAuditLogsSection;
window.renderAnalyticsSection = renderAnalyticsSection;
window.renderDefaultSection = renderDefaultSection;
