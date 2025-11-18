/**
 * Admin Wallet Management Module
 * Handles wallet monitoring, suspicious activity, and financial oversight
 */

class AdminWalletManager {
    constructor() {
        this.walletData = {};
        this.refreshInterval = null;
        this.charts = {};
        this.init();
    }

    init() {
        console.log('💳 Admin Wallet Manager initialized');
    }

    async loadWalletData() {
        if (!adminAuth.hasPermission('wallet.view')) {
            console.warn('❌ No permission to view wallet data');
            return;
        }

        try {
            const response = await adminAuth.makeRequest('/api/admin-wallet-monitoring/overview');
            
            if (response.success) {
                this.walletData = response.data;
                this.updateWalletUI();
                console.log('✅ Wallet data loaded');
            }
        } catch (error) {
            console.error('❌ Error loading wallet data:', error);
        }
    }

    renderWalletMonitoringSection() {
        const contentArea = document.getElementById('adminContent');
        
        contentArea.innerHTML = `
            <div class="section-header">
                <div class="header-content">
                    <h1>💳 Wallet Monitoring</h1>
                    <p>Real-time wallet oversight and suspicious activity detection</p>
                </div>
                <div class="header-actions">
                    <button onclick="walletManager.refreshWalletData()" class="btn-primary">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                </div>
            </div>

            <div class="wallet-stats-grid">
                <div class="stat-card primary">
                    <div class="stat-icon"><i class="fas fa-wallet"></i></div>
                    <div class="stat-content">
                        <h3 id="totalWalletBalance">$0</h3>
                        <p>Total Wallet Balance</p>
                    </div>
                </div>
                <div class="stat-card success">
                    <div class="stat-icon"><i class="fas fa-arrow-down"></i></div>
                    <div class="stat-content">
                        <h3 id="totalDeposits">$0</h3>
                        <p>Total Deposits</p>
                    </div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-icon"><i class="fas fa-arrow-up"></i></div>
                    <div class="stat-content">
                        <h3 id="totalWithdrawals">$0</h3>
                        <p>Total Withdrawals</p>
                    </div>
                </div>
                <div class="stat-card error">
                    <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="stat-content">
                        <h3 id="suspiciousCount">0</h3>
                        <p>Suspicious Activities</p>
                    </div>
                </div>
            </div>

            <div id="suspiciousActivityList"></div>
        `;

        this.loadWalletData();
    }

    updateWalletUI() {
        const data = this.walletData;
        if (document.getElementById('totalWalletBalance')) {
            document.getElementById('totalWalletBalance').textContent = AdminUtils.formatCurrency(data.total_balance || 0);
            document.getElementById('totalDeposits').textContent = AdminUtils.formatCurrency(data.total_deposits || 0);
            document.getElementById('totalWithdrawals').textContent = AdminUtils.formatCurrency(data.total_withdrawals || 0);
            document.getElementById('suspiciousCount').textContent = data.suspicious_count || 0;
        }
    }

    async refreshWalletData() {
        await this.loadWalletData();
        adminAuth.showNotification({
            type: 'success',
            title: 'Refreshed',
            message: 'Wallet data updated successfully'
        });
    }
}

const walletManager = new AdminWalletManager();
window.walletManager = walletManager;
