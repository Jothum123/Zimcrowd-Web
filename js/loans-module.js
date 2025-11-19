/**
 * Loans Module
 * Handles loan display, repayment, and loan requests (DTNI & Cold Start)
 */

const LoansModule = {
    loansData: null,
    
    async loadLoans() {
        const container = document.getElementById('loansContent');
        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading loans...</p></div>';
        
        try {
            this.loansData = await window.DashboardData.fetchLoans();
            this.renderLoans();
        } catch (error) {
            console.error('Error loading loans:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--danger);">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Failed to load loans</p>
                    <button class="btn btn-primary" onclick="LoansModule.loadLoans()">Retry</button>
                </div>
            `;
        }
    },
    
    renderLoans() {
        const container = document.getElementById('loansContent');
        const loans = this.loansData?.loans || [];
        
        if (loans.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-money-bill-wave" style="font-size: 4rem; color: var(--text-secondary); opacity: 0.3; margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--text-secondary); margin-bottom: 1rem;">No Active Loans</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem;">Get started by requesting your first loan</p>
                    <button class="btn btn-primary" onclick="LoansModule.showRequestLoanModal()">
                        <i class="fas fa-plus"></i> Request Loan
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div style="display: grid; gap: 1.5rem;">
                ${loans.map(loan => this.renderLoanCard(loan)).join('')}
            </div>
        `;
    },
    
    renderLoanCard(loan) {
        const progress = ((loan.amount_paid || 0) / loan.amount) * 100;
        
        return `
            <div class="card" style="padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="margin-bottom: 0.5rem;">Loan #${loan.id.substring(0, 8)}</h3>
                        <span class="badge ${window.DashboardCore.getStatusBadgeClass(loan.status)}">${loan.status}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">
                            ${window.DashboardCore.formatCurrency(loan.amount)}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">
                            ${loan.interest_rate}% interest
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="font-size: 0.85rem; color: var(--text-secondary);">Repayment Progress</span>
                        <span style="font-size: 0.85rem; font-weight: 600;">${progress.toFixed(0)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
                        <span>Paid: ${window.DashboardCore.formatCurrency(loan.amount_paid || 0)}</span>
                        <span>Remaining: ${window.DashboardCore.formatCurrency(loan.amount - (loan.amount_paid || 0))}</span>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem; padding: 1rem; background: var(--light); border-radius: 8px;">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Monthly Payment</div>
                        <div style="font-weight: 600;">${window.DashboardCore.formatCurrency(loan.monthly_installment)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Due Date</div>
                        <div style="font-weight: 600;">${window.DashboardCore.formatDate(loan.next_payment_date)}</div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.75rem;">
                    <button class="btn btn-primary" onclick="LoansModule.showRepaymentModal('${loan.id}', ${loan.monthly_installment})">
                        <i class="fas fa-money-bill-wave"></i> Make Payment
                    </button>
                    <button class="btn btn-outline" onclick="LoansModule.viewLoanHistory('${loan.id}')">
                        <i class="fas fa-history"></i> History
                    </button>
                </div>
            </div>
        `;
    },
    
    showRequestLoanModal() {
        const modal = document.createElement('div');
        modal.className = 'modal open';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2 class="modal-title">Request Loan</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
                        <button class="btn btn-primary" style="flex: 1;" onclick="LoansModule.showDTNILoan()">
                            <i class="fas fa-chart-line"></i> DTNI Loan
                        </button>
                        <button class="btn btn-secondary" style="flex: 1;" onclick="LoansModule.showColdStartLoan()">
                            <i class="fas fa-rocket"></i> Cold Start
                        </button>
                    </div>
                    
                    <div id="loanRequestForm">
                        <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                            Select a loan type to continue
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modalsContainer').appendChild(modal);
    },
    
    showDTNILoan() {
        document.getElementById('loanRequestForm').innerHTML = `
            <h3 style="margin-bottom: 1rem;">DTNI (Data-to-Next-Income) Loan</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                Upload your bank statement for instant loan approval based on your income data.
            </p>
            
            <div class="form-group">
                <label class="form-label">Loan Amount (USD)</label>
                <input type="number" class="form-input" id="loanAmount" placeholder="Enter amount" min="50" step="10">
            </div>
            
            <div class="form-group">
                <label class="form-label">Loan Purpose</label>
                <select class="form-select" id="loanPurpose">
                    <option value="">Select purpose</option>
                    <option value="business">Business</option>
                    <option value="education">Education</option>
                    <option value="medical">Medical</option>
                    <option value="personal">Personal</option>
                    <option value="emergency">Emergency</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Bank Statement (PDF)</label>
                <input type="file" class="form-input" id="bankStatement" accept=".pdf">
                <small style="color: var(--text-secondary);">Upload your last 3 months bank statement</small>
            </div>
            
            <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" onclick="LoansModule.submitDTNILoan()">
                <i class="fas fa-check"></i> Submit Application
            </button>
        `;
    },
    
    showColdStartLoan() {
        document.getElementById('loanRequestForm').innerHTML = `
            <h3 style="margin-bottom: 1rem;">Cold Start Loan</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                For new users without bank statement. Start with a smaller loan to build your credit history.
            </p>
            
            <div class="form-group">
                <label class="form-label">Loan Amount (USD)</label>
                <input type="number" class="form-input" id="loanAmount" placeholder="Max $100 for first loan" min="50" max="100" step="10">
                <small style="color: var(--text-secondary);">First-time limit: $100</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">Loan Purpose</label>
                <select class="form-select" id="loanPurpose">
                    <option value="">Select purpose</option>
                    <option value="business">Business</option>
                    <option value="education">Education</option>
                    <option value="personal">Personal</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Repayment Term</label>
                <select class="form-select" id="loanTerm">
                    <option value="1">1 month</option>
                    <option value="2">2 months</option>
                    <option value="3">3 months</option>
                </select>
            </div>
            
            <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" onclick="LoansModule.submitColdStartLoan()">
                <i class="fas fa-check"></i> Submit Application
            </button>
        `;
    },
    
    async submitDTNILoan() {
        const amount = document.getElementById('loanAmount').value;
        const purpose = document.getElementById('loanPurpose').value;
        const bankStatement = document.getElementById('bankStatement').files[0];
        
        if (!amount || !purpose || !bankStatement) {
            window.DashboardCore.showError('Please fill in all fields');
            return;
        }
        
        try {
            const result = await window.DashboardData.requestLoan({
                amount: parseFloat(amount),
                purpose,
                type: 'dtni',
                bankStatement: bankStatement.name
            });
            
            if (result.success) {
                window.DashboardCore.showSuccess('Loan application submitted successfully!');
                document.querySelector('.modal').remove();
                this.loadLoans();
            } else {
                window.DashboardCore.showError(result.message || 'Application failed');
            }
        } catch (error) {
            console.error('Loan application error:', error);
            window.DashboardCore.showError('Failed to submit application');
        }
    },
    
    async submitColdStartLoan() {
        const amount = document.getElementById('loanAmount').value;
        const purpose = document.getElementById('loanPurpose').value;
        const term = document.getElementById('loanTerm').value;
        
        if (!amount || !purpose || !term) {
            window.DashboardCore.showError('Please fill in all fields');
            return;
        }
        
        if (parseFloat(amount) > 100) {
            window.DashboardCore.showError('First-time loan limit is $100');
            return;
        }
        
        try {
            const result = await window.DashboardData.requestLoan({
                amount: parseFloat(amount),
                purpose,
                term: parseInt(term),
                type: 'cold_start'
            });
            
            if (result.success) {
                window.DashboardCore.showSuccess('Loan application submitted successfully!');
                document.querySelector('.modal').remove();
                this.loadLoans();
            } else {
                window.DashboardCore.showError(result.message || 'Application failed');
            }
        } catch (error) {
            console.error('Loan application error:', error);
            window.DashboardCore.showError('Failed to submit application');
        }
    },
    
    showRepaymentModal(loanId, amount) {
        const modal = document.createElement('div');
        modal.className = 'modal open';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">Make Payment</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Payment Amount (USD)</label>
                        <input type="number" class="form-input" id="repaymentAmount" value="${amount}" min="1" step="0.01">
                        <small style="color: var(--text-secondary);">Suggested: ${window.DashboardCore.formatCurrency(amount)}</small>
                    </div>
                    
                    <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" onclick="LoansModule.processRepayment('${loanId}')">
                        <i class="fas fa-check"></i> Confirm Payment
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modalsContainer').appendChild(modal);
    },
    
    async processRepayment(loanId) {
        const amount = document.getElementById('repaymentAmount').value;
        
        if (!amount || parseFloat(amount) < 1) {
            window.DashboardCore.showError('Please enter a valid amount');
            return;
        }
        
        try {
            const result = await window.DashboardData.repayLoan(loanId, parseFloat(amount));
            
            if (result.success) {
                window.DashboardCore.showSuccess('Payment processed successfully!');
                document.querySelector('.modal').remove();
                this.loadLoans();
            } else {
                window.DashboardCore.showError(result.message || 'Payment failed');
            }
        } catch (error) {
            console.error('Repayment error:', error);
            window.DashboardCore.showError('Failed to process payment');
        }
    },
    
    viewLoanHistory(loanId) {
        // TODO: Implement loan history view
        window.DashboardCore.showSuccess('Loan history feature coming soon!');
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('requestLoanBtn')?.addEventListener('click', () => {
        LoansModule.showRequestLoanModal();
    });
});

window.LoansModule = LoansModule;
console.log('✅ Loans Module loaded');
