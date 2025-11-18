/**
 * Admin Manual Transactions Module
 * Handles manual deposits, debits, and bank transfers
 */

class AdminManualTransactions {
    constructor() {
        this.transactionHistory = [];
        this.init();
    }

    init() {
        console.log('💰 Admin Manual Transactions initialized');
    }

    renderManualTransactionsSection() {
        const contentArea = document.getElementById('adminContent');
        
        contentArea.innerHTML = `
            <div class="section-header">
                <div class="header-content">
                    <h1>💰 Manual Transactions</h1>
                    <p>Process manual deposits, debits, and bank transfers</p>
                </div>
            </div>

            <div class="transaction-tabs">
                <button class="tab-btn active" onclick="manualTransactions.showTab('deposit')">
                    <i class="fas fa-plus-circle"></i> Manual Deposit
                </button>
                <button class="tab-btn" onclick="manualTransactions.showTab('debit')">
                    <i class="fas fa-minus-circle"></i> Manual Debit
                </button>
                <button class="tab-btn" onclick="manualTransactions.showTab('bank-transfer')">
                    <i class="fas fa-university"></i> Bank Transfer
                </button>
                <button class="tab-btn" onclick="manualTransactions.showTab('history')">
                    <i class="fas fa-history"></i> History
                </button>
            </div>

            <div id="transactionContent">
                ${this.renderDepositForm()}
            </div>
        `;
    }

    showTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.closest('.tab-btn').classList.add('active');

        const content = document.getElementById('transactionContent');
        
        switch(tabName) {
            case 'deposit':
                content.innerHTML = this.renderDepositForm();
                break;
            case 'debit':
                content.innerHTML = this.renderDebitForm();
                break;
            case 'bank-transfer':
                content.innerHTML = this.renderBankTransferForm();
                break;
            case 'history':
                content.innerHTML = this.renderHistoryView();
                this.loadTransactionHistory();
                break;
        }
    }

    renderDepositForm() {
        return `
            <div class="transaction-form-card">
                <h3>Manual Deposit</h3>
                <form id="depositForm" onsubmit="manualTransactions.processDeposit(event)">
                    <div class="form-group">
                        <label>User Email or ID</label>
                        <input type="text" id="depositUserId" required placeholder="Enter user email or ID">
                        <button type="button" onclick="manualTransactions.validateUser('depositUserId')" class="btn-validate">
                            <i class="fas fa-search"></i> Validate
                        </button>
                    </div>
                    <div class="form-group">
                        <label>Amount (USD)</label>
                        <input type="number" id="depositAmount" step="0.01" min="0.01" required placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label>Payment Method</label>
                        <select id="depositMethod">
                            <option value="manual">Manual Credit</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cash">Cash Deposit</option>
                            <option value="correction">Balance Correction</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Reference Number</label>
                        <input type="text" id="depositReference" placeholder="Optional reference">
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="depositNotes" rows="3" placeholder="Reason for manual deposit"></textarea>
                    </div>
                    <button type="submit" class="btn-primary btn-large">
                        <i class="fas fa-check"></i> Process Deposit
                    </button>
                </form>
            </div>
        `;
    }

    renderDebitForm() {
        return `
            <div class="transaction-form-card">
                <h3>Manual Debit</h3>
                <form id="debitForm" onsubmit="manualTransactions.processDebit(event)">
                    <div class="form-group">
                        <label>User Email or ID</label>
                        <input type="text" id="debitUserId" required placeholder="Enter user email or ID">
                        <button type="button" onclick="manualTransactions.validateUser('debitUserId')" class="btn-validate">
                            <i class="fas fa-search"></i> Validate
                        </button>
                    </div>
                    <div class="form-group">
                        <label>Amount (USD)</label>
                        <input type="number" id="debitAmount" step="0.01" min="0.01" required placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label>Reason</label>
                        <select id="debitReason">
                            <option value="fee">Service Fee</option>
                            <option value="penalty">Penalty</option>
                            <option value="correction">Balance Correction</option>
                            <option value="chargeback">Chargeback</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Reference Number</label>
                        <input type="text" id="debitReference" placeholder="Optional reference">
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="debitNotes" rows="3" placeholder="Reason for manual debit" required></textarea>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="forceDebit">
                            Force debit (allow negative balance)
                        </label>
                    </div>
                    <button type="submit" class="btn-primary btn-large">
                        <i class="fas fa-check"></i> Process Debit
                    </button>
                </form>
            </div>
        `;
    }

    renderBankTransferForm() {
        return `
            <div class="transaction-form-card">
                <h3>Bank Transfer Deposit</h3>
                <form id="bankTransferForm" onsubmit="manualTransactions.processBankTransfer(event)">
                    <div class="form-group">
                        <label>User Email or ID</label>
                        <input type="text" id="bankUserId" required placeholder="Enter user email or ID">
                        <button type="button" onclick="manualTransactions.validateUser('bankUserId')" class="btn-validate">
                            <i class="fas fa-search"></i> Validate
                        </button>
                    </div>
                    <div class="form-group">
                        <label>Amount (USD)</label>
                        <input type="number" id="bankAmount" step="0.01" min="0.01" required placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label>Bank Name</label>
                        <input type="text" id="bankName" required placeholder="e.g., FBC Bank">
                    </div>
                    <div class="form-group">
                        <label>Bank Reference Number</label>
                        <input type="text" id="bankReference" required placeholder="Bank transaction reference">
                    </div>
                    <div class="form-group">
                        <label>Depositor Name</label>
                        <input type="text" id="depositorName" required placeholder="Name on bank account">
                    </div>
                    <div class="form-group">
                        <label>Account Number (Optional)</label>
                        <input type="text" id="accountNumber" placeholder="Bank account number">
                    </div>
                    <div class="form-group">
                        <label>Deposit Date</label>
                        <input type="date" id="depositDate" required>
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="bankNotes" rows="3" placeholder="Additional information"></textarea>
                    </div>
                    <button type="submit" class="btn-primary btn-large">
                        <i class="fas fa-check"></i> Process Bank Transfer
                    </button>
                </form>
            </div>
        `;
    }

    renderHistoryView() {
        return `
            <div class="transaction-history-card">
                <div class="history-header">
                    <h3>Transaction History</h3>
                    <div class="history-filters">
                        <select id="historyType" onchange="manualTransactions.loadTransactionHistory()">
                            <option value="all">All Types</option>
                            <option value="deposit">Deposits</option>
                            <option value="debit">Debits</option>
                            <option value="bank_transfer">Bank Transfers</option>
                        </select>
                        <select id="historyTimeframe" onchange="manualTransactions.loadTransactionHistory()">
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d" selected>Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                </div>
                <div id="historyList">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>Loading transaction history...</p>
                    </div>
                </div>
            </div>
        `;
    }

    async validateUser(inputId) {
        const identifier = document.getElementById(inputId).value.trim();
        if (!identifier) return;

        try {
            const response = await adminAuth.makeRequest('/api/admin-manual-transactions/validate-user', {
                method: 'POST',
                body: JSON.stringify({ identifier })
            });

            if (response.success) {
                adminAuth.showNotification({
                    type: 'success',
                    title: 'User Found',
                    message: `User: ${response.data.user.full_name || response.data.user.email}`
                });
            } else {
                adminAuth.showNotification({
                    type: 'error',
                    title: 'User Not Found',
                    message: response.error || 'User not found'
                });
            }
        } catch (error) {
            console.error('❌ User validation error:', error);
        }
    }

    async processDeposit(event) {
        event.preventDefault();
        
        if (!adminAuth.requirePermission('finance.deposits')) return;

        const formData = {
            user_id: document.getElementById('depositUserId').value,
            amount: parseFloat(document.getElementById('depositAmount').value),
            method: document.getElementById('depositMethod').value,
            reference: document.getElementById('depositReference').value,
            notes: document.getElementById('depositNotes').value
        };

        try {
            const response = await adminAuth.makeRequest('/api/admin-manual-transactions/deposit', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response.success) {
                adminAuth.showNotification({
                    type: 'success',
                    title: 'Deposit Processed',
                    message: `Successfully deposited ${AdminUtils.formatCurrency(formData.amount)}`
                });
                event.target.reset();
            } else {
                throw new Error(response.error || 'Deposit failed');
            }
        } catch (error) {
            adminAuth.showNotification({
                type: 'error',
                title: 'Deposit Failed',
                message: error.message
            });
        }
    }

    async processDebit(event) {
        event.preventDefault();
        
        if (!adminAuth.requirePermission('finance.withdrawals')) return;

        const formData = {
            user_id: document.getElementById('debitUserId').value,
            amount: parseFloat(document.getElementById('debitAmount').value),
            reason: document.getElementById('debitReason').value,
            reference: document.getElementById('debitReference').value,
            notes: document.getElementById('debitNotes').value,
            force_debit: document.getElementById('forceDebit').checked
        };

        try {
            const response = await adminAuth.makeRequest('/api/admin-manual-transactions/debit', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response.success) {
                adminAuth.showNotification({
                    type: 'success',
                    title: 'Debit Processed',
                    message: `Successfully debited ${AdminUtils.formatCurrency(formData.amount)}`
                });
                event.target.reset();
            } else {
                throw new Error(response.error || 'Debit failed');
            }
        } catch (error) {
            adminAuth.showNotification({
                type: 'error',
                title: 'Debit Failed',
                message: error.message
            });
        }
    }

    async processBankTransfer(event) {
        event.preventDefault();
        
        if (!adminAuth.requirePermission('finance.bank_transfers')) return;

        const formData = {
            user_id: document.getElementById('bankUserId').value,
            amount: parseFloat(document.getElementById('bankAmount').value),
            bank_name: document.getElementById('bankName').value,
            bank_reference: document.getElementById('bankReference').value,
            depositor_name: document.getElementById('depositorName').value,
            account_number: document.getElementById('accountNumber').value,
            deposit_date: document.getElementById('depositDate').value,
            notes: document.getElementById('bankNotes').value
        };

        try {
            const response = await adminAuth.makeRequest('/api/admin-manual-transactions/bank-transfer', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response.success) {
                adminAuth.showNotification({
                    type: 'success',
                    title: 'Bank Transfer Processed',
                    message: `Successfully processed ${AdminUtils.formatCurrency(formData.amount)}`
                });
                event.target.reset();
            } else {
                throw new Error(response.error || 'Bank transfer failed');
            }
        } catch (error) {
            adminAuth.showNotification({
                type: 'error',
                title: 'Bank Transfer Failed',
                message: error.message
            });
        }
    }

    async loadTransactionHistory() {
        const type = document.getElementById('historyType')?.value || 'all';
        const timeframe = document.getElementById('historyTimeframe')?.value || '7d';

        try {
            const response = await adminAuth.makeRequest(
                `/api/admin-manual-transactions/history?type=${type}&timeframe=${timeframe}`
            );

            if (response.success) {
                this.transactionHistory = response.data;
                this.renderTransactionHistory();
            }
        } catch (error) {
            console.error('❌ Error loading transaction history:', error);
        }
    }

    renderTransactionHistory() {
        const container = document.getElementById('historyList');
        if (!container) return;

        if (this.transactionHistory.length === 0) {
            container.innerHTML = '<p class="no-data">No transactions found</p>';
            return;
        }

        const html = this.transactionHistory.map(tx => `
            <div class="transaction-item">
                <div class="tx-icon ${tx.type}">
                    <i class="fas fa-${tx.type === 'deposit' ? 'arrow-down' : 'arrow-up'}"></i>
                </div>
                <div class="tx-details">
                    <h4>${tx.type.toUpperCase()}</h4>
                    <p>${tx.user_email || tx.user_id}</p>
                    <span class="tx-date">${AdminUtils.formatDate(tx.created_at)}</span>
                </div>
                <div class="tx-amount ${tx.type}">
                    ${AdminUtils.formatCurrency(tx.amount)}
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }
}

const manualTransactions = new AdminManualTransactions();
window.manualTransactions = manualTransactions;
