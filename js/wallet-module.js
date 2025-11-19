/**
 * Wallet Module
 * Handles wallet operations: add funds, withdraw, transaction history
 */

const WalletModule = {
    walletData: null,
    
    async loadWallet() {
        const container = document.getElementById('walletContent');
        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading wallet...</p></div>';
        
        try {
            this.walletData = await window.DashboardData.fetchWallet();
            this.renderWallet();
        } catch (error) {
            console.error('Error loading wallet:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--danger);">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Failed to load wallet</p>
                    <button class="btn btn-primary" onclick="WalletModule.loadWallet()">Retry</button>
                </div>
            `;
        }
    },
    
    renderWallet() {
        const container = document.getElementById('walletContent');
        const balance = this.walletData?.balance || 0;
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">Available Balance</span>
                        <div class="stat-icon wallet">
                            <i class="fas fa-wallet"></i>
                        </div>
                    </div>
                    <div class="stat-value">$${balance.toFixed(2)}</div>
                    <div class="stat-change">
                        Last updated: ${new Date().toLocaleString()}
                    </div>
                </div>
            </div>
            
            <h3 style="margin-bottom: 1rem;">Recent Transactions</h3>
            <div id="walletTransactions">
                <div class="loading"><div class="spinner"></div><p>Loading transactions...</p></div>
            </div>
        `;
        
        this.loadWalletTransactions();
    },
    
    async loadWalletTransactions() {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/wallet/transactions?limit=10`,
                { headers: window.DashboardCore.API_CONFIG.HEADERS }
            );
            
            if (response.ok) {
                const result = await response.json();
                const transactions = result.data?.transactions || [];
                
                const container = document.getElementById('walletTransactions');
                
                if (transactions.length === 0) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                            <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                            <p>No transactions yet</p>
                        </div>
                    `;
                    return;
                }
                
                container.innerHTML = `
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
                                    <td>${window.DashboardCore.formatDate(tx.created_at)}</td>
                                    <td>${tx.type}</td>
                                    <td>${window.DashboardCore.formatCurrency(tx.amount)}</td>
                                    <td><span class="badge ${window.DashboardCore.getStatusBadgeClass(tx.status)}">${tx.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
        } catch (error) {
            console.error('Error loading wallet transactions:', error);
        }
    },
    
    showAddFundsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal open';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">Add Funds</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Amount (USD)</label>
                        <input type="number" class="form-input" id="depositAmount" placeholder="Enter amount" min="1" step="0.01">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Payment Method</label>
                        <select class="form-select" id="paymentMethod">
                            <option value="">Select payment method</option>
                            <option value="paynow_express">Paynow Express Checkout</option>
                            <option value="paynow_redirect">Paynow Redirect</option>
                            <option value="ecocash">EcoCash</option>
                            <option value="onemoney">OneMoney</option>
                            <option value="telecash">Telecash</option>
                        </select>
                    </div>
                    
                    <div id="paymentDetails"></div>
                    
                    <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" onclick="WalletModule.processDeposit()">
                        <i class="fas fa-plus-circle"></i> Add Funds
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modalsContainer').appendChild(modal);
        
        // Payment method change handler
        document.getElementById('paymentMethod').addEventListener('change', (e) => {
            this.showPaymentDetails(e.target.value);
        });
    },
    
    showPaymentDetails(method) {
        const container = document.getElementById('paymentDetails');
        
        switch(method) {
            case 'paynow_express':
            case 'paynow_redirect':
                container.innerHTML = `
                    <div class="form-group">
                        <label class="form-label">Phone Number</label>
                        <input type="tel" class="form-input" id="paymentPhone" placeholder="+263771234567">
                    </div>
                `;
                break;
            case 'ecocash':
            case 'onemoney':
            case 'telecash':
                container.innerHTML = `
                    <div class="form-group">
                        <label class="form-label">Mobile Number</label>
                        <input type="tel" class="form-input" id="paymentPhone" placeholder="+263771234567">
                    </div>
                `;
                break;
            default:
                container.innerHTML = '';
        }
    },
    
    async processDeposit() {
        const amount = document.getElementById('depositAmount').value;
        const method = document.getElementById('paymentMethod').value;
        const phone = document.getElementById('paymentPhone')?.value;
        
        if (!amount || !method) {
            window.DashboardCore.showError('Please fill in all fields');
            return;
        }
        
        if (parseFloat(amount) < 1) {
            window.DashboardCore.showError('Minimum deposit is $1');
            return;
        }
        
        try {
            const result = await window.DashboardData.depositFunds({
                amount: parseFloat(amount),
                method,
                phone
            });
            
            if (result.success) {
                window.DashboardCore.showSuccess('Deposit initiated successfully!');
                document.querySelector('.modal').remove();
                this.loadWallet();
                
                // If redirect URL provided
                if (result.redirectUrl) {
                    window.location.href = result.redirectUrl;
                }
            } else {
                window.DashboardCore.showError(result.message || 'Deposit failed');
            }
        } catch (error) {
            console.error('Deposit error:', error);
            window.DashboardCore.showError('Failed to process deposit');
        }
    },
    
    showWithdrawModal() {
        const modal = document.createElement('div');
        modal.className = 'modal open';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">Withdraw Funds</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Amount (USD)</label>
                        <input type="number" class="form-input" id="withdrawAmount" placeholder="Enter amount" min="1" step="0.01">
                        <small style="color: var(--text-secondary);">Available: $${(this.walletData?.balance || 0).toFixed(2)}</small>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Withdrawal Method</label>
                        <select class="form-select" id="withdrawMethod">
                            <option value="">Select method</option>
                            <option value="bank">Bank Account</option>
                            <option value="mobile">Mobile Money</option>
                        </select>
                    </div>
                    
                    <div id="withdrawDetails"></div>
                    
                    <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" onclick="WalletModule.processWithdraw()">
                        <i class="fas fa-minus-circle"></i> Withdraw Funds
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modalsContainer').appendChild(modal);
        
        document.getElementById('withdrawMethod').addEventListener('change', (e) => {
            this.showWithdrawDetails(e.target.value);
        });
    },
    
    showWithdrawDetails(method) {
        const container = document.getElementById('withdrawDetails');
        
        if (method === 'bank') {
            container.innerHTML = `
                <div class="form-group">
                    <label class="form-label">Bank Name</label>
                    <input type="text" class="form-input" id="bankName" placeholder="Enter bank name">
                </div>
                <div class="form-group">
                    <label class="form-label">Account Number</label>
                    <input type="text" class="form-input" id="accountNumber" placeholder="Enter account number">
                </div>
            `;
        } else if (method === 'mobile') {
            container.innerHTML = `
                <div class="form-group">
                    <label class="form-label">Mobile Provider</label>
                    <select class="form-select" id="mobileProvider">
                        <option value="ecocash">EcoCash</option>
                        <option value="onemoney">OneMoney</option>
                        <option value="telecash">Telecash</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Mobile Number</label>
                    <input type="tel" class="form-input" id="mobileNumber" placeholder="+263771234567">
                </div>
            `;
        } else {
            container.innerHTML = '';
        }
    },
    
    async processWithdraw() {
        const amount = document.getElementById('withdrawAmount').value;
        const method = document.getElementById('withdrawMethod').value;
        
        if (!amount || !method) {
            window.DashboardCore.showError('Please fill in all fields');
            return;
        }
        
        const withdrawAmount = parseFloat(amount);
        
        if (withdrawAmount < 1) {
            window.DashboardCore.showError('Minimum withdrawal is $1');
            return;
        }
        
        if (withdrawAmount > (this.walletData?.balance || 0)) {
            window.DashboardCore.showError('Insufficient balance');
            return;
        }
        
        const withdrawData = { amount: withdrawAmount, method };
        
        if (method === 'bank') {
            withdrawData.bankName = document.getElementById('bankName').value;
            withdrawData.accountNumber = document.getElementById('accountNumber').value;
        } else if (method === 'mobile') {
            withdrawData.provider = document.getElementById('mobileProvider').value;
            withdrawData.mobileNumber = document.getElementById('mobileNumber').value;
        }
        
        try {
            const result = await window.DashboardData.withdrawFunds(withdrawData);
            
            if (result.success) {
                window.DashboardCore.showSuccess('Withdrawal request submitted!');
                document.querySelector('.modal').remove();
                this.loadWallet();
            } else {
                window.DashboardCore.showError(result.message || 'Withdrawal failed');
            }
        } catch (error) {
            console.error('Withdrawal error:', error);
            window.DashboardCore.showError('Failed to process withdrawal');
        }
    }
};

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addFundsBtn')?.addEventListener('click', () => {
        WalletModule.showAddFundsModal();
    });
    
    document.getElementById('withdrawBtn')?.addEventListener('click', () => {
        WalletModule.showWithdrawModal();
    });
});

// Export
window.WalletModule = WalletModule;

console.log('✅ Wallet Module loaded');
