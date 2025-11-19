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
            <div class="modal-content" style="max-width: 1200px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2 class="modal-title"><i class="fas fa-dollar-sign"></i> Loan Application</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="loan-application-container">
                        <div class="loan-form-grid">
                            <!-- Left Column - Form -->
                            <div class="loan-form-section">
                                <div class="section-header">
                                    <h3><i class="fas fa-edit"></i> Loan Details</h3>
                                </div>
                                
                                <form id="loanApplicationForm" class="loan-form">
                                    <!-- Amount -->
                                    <div class="form-group">
                                        <label class="form-label">Loan Amount ($)</label>
                                        <input type="number" id="loanAmount" class="form-input" 
                                               min="50" max="100000" step="1" 
                                               placeholder="Enter loan amount">
                                        <div id="maxLoanHint" class="form-hint" style="display: none;">
                                            <button type="button" class="max-loan-btn" onclick="LoansModule.setMaxAmount()">
                                                <i class="fas fa-arrow-up"></i> Use Max: $<span id="maxAmountValue">0</span>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Term -->
                                    <div class="form-group">
                                        <label class="form-label">Loan Term</label>
                                        <select id="loanTerm" class="form-select">
                                            <option value="90">3 months (90 days)</option>
                                            <option value="180">6 months (180 days)</option>
                                            <option value="270">9 months (270 days)</option>
                                            <option value="360">12 months (360 days)</option>
                                            <option value="540">18 months (540 days)</option>
                                            <option value="720">24 months (720 days)</option>
                                        </select>
                                    </div>

                                    <!-- Interest Rate -->
                                    <div class="form-group">
                                        <label class="form-label">Interest Rate (%)</label>
                                        <input type="range" id="interestRate" class="form-range" 
                                               min="0" max="10" step="0.5" value="5">
                                        <div class="range-display">
                                            <span id="interestRateValue">5</span>% annual
                                        </div>
                                    </div>

                                    <!-- Purpose -->
                                    <div class="form-group">
                                        <label class="form-label">Loan Purpose</label>
                                        <textarea id="loanPurpose" class="form-textarea" 
                                                  placeholder="Describe how you plan to use this loan..." 
                                                  rows="3" maxlength="500"></textarea>
                                        <div class="char-count">
                                            <span id="purposeCharCount">0</span>/500
                                        </div>
                                    </div>

                                    <!-- Validate Button -->
                                    <button type="button" id="validateLoanBtn" class="btn btn-primary" 
                                            onclick="LoansModule.validateLoan()" disabled>
                                        <i class="fas fa-calculator"></i> Validate Loan
                                    </button>
                                </form>
                            </div>

                            <!-- Right Column - Results -->
                            <div class="loan-results-section">
                                <!-- Max Loan Capacity -->
                                <div id="maxLoanCapacity" class="result-card" style="display: none;">
                                    <div class="card-header">
                                        <h4><i class="fas fa-calculator"></i> Maximum Loan Capacity</h4>
                                    </div>
                                    <div class="card-content">
                                        <div class="capacity-section">
                                            <h5>DTNI Analysis</h5>
                                            <div class="capacity-grid">
                                                <div class="capacity-item">
                                                    <span>Net Salary:</span>
                                                    <span id="netSalary">$0</span>
                                                </div>
                                                <div class="capacity-item">
                                                    <span>Max Installment (40%):</span>
                                                    <span id="maxInstallment">$0</span>
                                                </div>
                                                <div class="capacity-item">
                                                    <span>Available Capacity:</span>
                                                    <span id="availableCapacity">$0</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="capacity-section">
                                            <h5>Loan Limits</h5>
                                            <div class="capacity-grid">
                                                <div class="capacity-item">
                                                    <span>From DTNI:</span>
                                                    <span id="maxFromDTNI">$0</span>
                                                </div>
                                                <div class="capacity-item">
                                                    <span>Employment Cap:</span>
                                                    <span id="employmentCap">$0</span>
                                                </div>
                                                <div class="capacity-item highlight">
                                                    <span>Final Maximum:</span>
                                                    <span id="finalMaxAmount">$0</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="capacity-section">
                                            <h5>Repayment Details</h5>
                                            <div class="capacity-grid">
                                                <div class="capacity-item">
                                                    <span>Monthly Payment:</span>
                                                    <span id="monthlyPayment">$0</span>
                                                </div>
                                                <div class="capacity-item">
                                                    <span>Total Interest:</span>
                                                    <span id="totalInterest">$0</span>
                                                </div>
                                                <div class="capacity-item">
                                                    <span>Total Repayment:</span>
                                                    <span id="totalRepayment">$0</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Validation Results -->
                                <div id="validationResults" class="result-card" style="display: none;">
                                    <div class="card-header">
                                        <h4 id="validationTitle">
                                            <i id="validationIcon" class="fas fa-check-circle"></i> 
                                            Validation Result
                                        </h4>
                                    </div>
                                    <div class="card-content">
                                        <div id="validationMessage" class="validation-alert"></div>
                                        
                                        <div id="approvedDetails" style="display: none;">
                                            <div class="capacity-grid">
                                                <div class="capacity-item">
                                                    <span>Monthly Payment:</span>
                                                    <span id="approvedMonthly">$0</span>
                                                </div>
                                                <div class="capacity-item">
                                                    <span>Total Amount:</span>
                                                    <span id="approvedTotal">$0</span>
                                                </div>
                                            </div>
                                            
                                            <button id="submitApplicationBtn" class="btn btn-success" 
                                                    onclick="LoansModule.submitApplication()" style="width: 100%; margin-top: 1rem;">
                                                <i class="fas fa-file-text"></i> Submit Application
                                            </button>
                                        </div>

                                        <div id="dtniBreakdown" style="display: none;">
                                            <h5>DTNI Breakdown</h5>
                                            <div class="capacity-grid">
                                                <div class="capacity-item">
                                                    <span>Installment Utilization:</span>
                                                    <span id="installmentUtilization">0%</span>
                                                </div>
                                                <div class="capacity-item">
                                                    <span>Remaining Capacity:</span>
                                                    <span id="remainingCapacity">$0</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Loading State -->
                                <div id="loadingState" class="result-card" style="display: none;">
                                    <div class="loading-content">
                                        <div class="spinner"></div>
                                        <p id="loadingText">Calculating...</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Help Section -->
                        <div class="help-section">
                            <h4><i class="fas fa-info-circle"></i> How it works:</h4>
                            <ol>
                                <li>Enter your desired loan amount and terms</li>
                                <li>System validates against your DTNI capacity</li>
                                <li>Get instant pre-approval or suggestions</li>
                                <li>Submit application for final processing</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modalsContainer').appendChild(modal);
        this.initializeLoanForm();
    },
    
    // Initialize the loan application form
    initializeLoanForm() {
        this.formData = {
            amount: '',
            termDays: '90',
            interestRate: '5',
            purpose: ''
        };
        
        this.maxLoanData = null;
        this.validationResult = null;
        
        // Set up event listeners
        this.setupFormEventListeners();
        
        // Calculate max loan on load
        this.calculateMaxLoan();
    },
    
    setupFormEventListeners() {
        const amountInput = document.getElementById('loanAmount');
        const termSelect = document.getElementById('loanTerm');
        const interestRange = document.getElementById('interestRate');
        const purposeTextarea = document.getElementById('loanPurpose');
        const validateBtn = document.getElementById('validateLoanBtn');
        
        // Amount input
        amountInput.addEventListener('input', (e) => {
            this.formData.amount = e.target.value;
            this.updateValidateButton();
        });
        
        // Term select
        termSelect.addEventListener('change', (e) => {
            this.formData.termDays = e.target.value;
            this.calculateMaxLoan();
        });
        
        // Interest rate range
        interestRange.addEventListener('input', (e) => {
            this.formData.interestRate = e.target.value;
            document.getElementById('interestRateValue').textContent = e.target.value;
            this.calculateMaxLoan();
        });
        
        // Purpose textarea
        purposeTextarea.addEventListener('input', (e) => {
            this.formData.purpose = e.target.value;
            document.getElementById('purposeCharCount').textContent = e.target.value.length;
            this.updateValidateButton();
        });
    },
    
    updateValidateButton() {
        const validateBtn = document.getElementById('validateLoanBtn');
        const hasAmount = this.formData.amount && parseFloat(this.formData.amount) >= 50;
        const hasPurpose = this.formData.purpose && this.formData.purpose.length >= 5;
        
        validateBtn.disabled = !hasAmount || !hasPurpose;
    },
    
    async calculateMaxLoan() {
        try {
            this.showLoading('Calculating maximum loan...');
            
            const response = await fetch('/api/loans/calculate-max', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    termDays: parseInt(this.formData.termDays),
                    interestRate: parseFloat(this.formData.interestRate)
                })
            });

            const result = await response.json();
            if (result.success) {
                this.maxLoanData = result.data;
                this.displayMaxLoanData();
            }
        } catch (error) {
            console.error('Max loan calculation error:', error);
        } finally {
            this.hideLoading();
        }
    },
    
    displayMaxLoanData() {
        if (!this.maxLoanData) return;
        
        const maxLoanCard = document.getElementById('maxLoanCapacity');
        maxLoanCard.style.display = 'block';
        
        // DTNI Analysis
        const dtni = this.maxLoanData.dtniAnalysis || {};
        document.getElementById('netSalary').textContent = `$${dtni.netSalary || 0}`;
        document.getElementById('maxInstallment').textContent = `$${dtni.maxInstallmentCapacity || 0}`;
        document.getElementById('availableCapacity').textContent = `$${dtni.availableCapacity || 0}`;
        
        // Loan Limits
        const loan = this.maxLoanData.loanCalculation || {};
        document.getElementById('maxFromDTNI').textContent = `$${loan.maxLoanFromDTNI || 0}`;
        document.getElementById('employmentCap').textContent = `$${loan.employmentCap || 0}`;
        document.getElementById('finalMaxAmount').textContent = `$${loan.finalMaxLoanAmount || 0}`;
        
        // Repayment Details
        const repayment = this.maxLoanData.repaymentDetails || {};
        document.getElementById('monthlyPayment').textContent = `$${repayment.monthlyRepayment || 0}`;
        document.getElementById('totalInterest').textContent = `$${repayment.totalInterest || 0}`;
        document.getElementById('totalRepayment').textContent = `$${repayment.totalRepayment || 0}`;
        
        // Show max amount button
        const maxHint = document.getElementById('maxLoanHint');
        const maxAmountValue = document.getElementById('maxAmountValue');
        if (loan.finalMaxLoanAmount) {
            maxAmountValue.textContent = loan.finalMaxLoanAmount;
            maxHint.style.display = 'block';
        }
    },
    
    setMaxAmount() {
        if (this.maxLoanData?.loanCalculation?.finalMaxLoanAmount) {
            document.getElementById('loanAmount').value = this.maxLoanData.loanCalculation.finalMaxLoanAmount;
            this.formData.amount = this.maxLoanData.loanCalculation.finalMaxLoanAmount;
            this.updateValidateButton();
        }
    },
    
    async validateLoan() {
        if (!this.formData.amount || !this.formData.purpose) {
            window.DashboardCore.showError('Please fill in all required fields');
            return;
        }
        
        try {
            this.showLoading('Validating loan application...');
            
            const response = await fetch('/api/loans/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    amount: parseFloat(this.formData.amount),
                    termDays: parseInt(this.formData.termDays),
                    interestRate: parseFloat(this.formData.interestRate)
                })
            });

            const result = await response.json();
            this.validationResult = result;
            this.displayValidationResult();
        } catch (error) {
            console.error('Validation error:', error);
            window.DashboardCore.showError('Failed to validate loan');
        } finally {
            this.hideLoading();
        }
    },
    
    displayValidationResult() {
        if (!this.validationResult) return;
        
        const resultsCard = document.getElementById('validationResults');
        const validationIcon = document.getElementById('validationIcon');
        const validationMessage = document.getElementById('validationMessage');
        const approvedDetails = document.getElementById('approvedDetails');
        const dtniBreakdown = document.getElementById('dtniBreakdown');
        
        resultsCard.style.display = 'block';
        
        // Update icon and message
        if (this.validationResult.approved) {
            validationIcon.className = 'fas fa-check-circle';
            validationIcon.style.color = '#22c55e';
            validationMessage.className = 'validation-alert success';
            validationMessage.textContent = this.validationResult.message;
            
            // Show approved details
            approvedDetails.style.display = 'block';
            document.getElementById('approvedMonthly').textContent = `$${this.validationResult.data?.monthlyInstallment || 0}`;
            document.getElementById('approvedTotal').textContent = `$${this.validationResult.data?.totalAmount || 0}`;
        } else {
            validationIcon.className = 'fas fa-times-circle';
            validationIcon.style.color = '#ef4444';
            validationMessage.className = 'validation-alert error';
            validationMessage.textContent = this.validationResult.message;
            
            approvedDetails.style.display = 'none';
        }
        
        // Show DTNI breakdown if available
        if (this.validationResult.data?.dtni) {
            dtniBreakdown.style.display = 'block';
            document.getElementById('installmentUtilization').textContent = this.validationResult.data.dtni.installmentUtilization || '0%';
            document.getElementById('remainingCapacity').textContent = `$${this.validationResult.data.dtni.remainingCapacity || 0}`;
        }
    },
    
    async submitApplication() {
        if (!this.validationResult?.approved) {
            window.DashboardCore.showError('Please validate your loan first');
            return;
        }
        
        try {
            this.showLoading('Submitting application...');
            
            const response = await fetch('/api/loans/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    amount: parseFloat(this.formData.amount),
                    termDays: parseInt(this.formData.termDays),
                    interestRate: parseFloat(this.formData.interestRate),
                    purpose: this.formData.purpose
                })
            });

            const result = await response.json();
            
            if (result.success) {
                window.DashboardCore.showSuccess('Loan application submitted successfully!');
                document.querySelector('.modal').remove();
                this.loadLoans();
            } else {
                window.DashboardCore.showError(result.message || 'Application failed');
            }
        } catch (error) {
            console.error('Application error:', error);
            window.DashboardCore.showError('Failed to submit application');
        } finally {
            this.hideLoading();
        }
    },
    
    showLoading(text = 'Loading...') {
        const loadingState = document.getElementById('loadingState');
        const loadingText = document.getElementById('loadingText');
        loadingText.textContent = text;
        loadingState.style.display = 'block';
    },
    
    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        loadingState.style.display = 'none';
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
