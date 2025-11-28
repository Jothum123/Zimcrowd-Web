/**
 * Returns Distribution System
 * Calculates and distributes returns to investors proportionally
 * Shows investors exactly how much they're getting from each investment
 */

const ReturnsDistribution = {
    apiBase: window.API_CONFIG?.baseURL || 'https://zimcrowd-api.onrender.com/api',
    
    /**
     * Calculate returns for a single investor in a loan
     * @param {Object} investment - Investment details
     * @param {Object} loanPayment - Loan payment received
     * @returns {Object} Detailed return breakdown
     */
    calculateInvestorReturns(investment, loanPayment) {
        const investmentAmount = parseFloat(investment.amount || 0);
        const investmentPercentage = parseFloat(investment.percentage || 0);
        const totalLoanAmount = parseFloat(investment.loan_amount || 0);
        const paymentAmount = parseFloat(loanPayment.amount || 0);
        
        // Calculate proportional share of this payment
        const proportionalShare = paymentAmount * (investmentPercentage / 100);
        
        // No ongoing fees for lenders (collection fee removed)
        const netReturn = proportionalShare;
        
        // Calculate cumulative returns
        const previousReturns = parseFloat(investment.total_returns_received || 0);
        const newTotalReturns = previousReturns + netReturn;
        
        // Calculate profit/loss
        const totalInvested = investmentAmount + parseFloat(investment.fees_paid || 0);
        const netProfit = newTotalReturns - totalInvested;
        const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;
        
        // Calculate progress
        const expectedTotalReturns = parseFloat(investment.expected_returns || investmentAmount);
        const progressPercentage = (newTotalReturns / expectedTotalReturns) * 100;
        
        return {
            investmentId: investment.id,
            investorId: investment.investor_id,
            investorName: investment.investor_name,
            loanId: investment.loan_id,
            borrowerName: investment.borrower_name,
            
            // Investment details
            investmentAmount,
            investmentPercentage,
            feesPaid: parseFloat(investment.fees_paid || 0),
            totalInvested,
            
            // This payment
            paymentDate: loanPayment.payment_date,
            paymentNumber: loanPayment.payment_number,
            totalPaymentAmount: paymentAmount,
            yourShare: proportionalShare,
            netReturn,
            
            // Cumulative
            previousReturns,
            newTotalReturns,
            expectedTotalReturns,
            progressPercentage: Math.min(progressPercentage, 100),
            
            // Profit/Loss
            netProfit,
            roi,
            status: netProfit >= 0 ? 'profitable' : 'in_progress',
            
            // Remaining
            remainingReturns: Math.max(0, expectedTotalReturns - newTotalReturns),
            paymentsRemaining: parseInt(investment.payments_remaining || 0) - 1
        };
    },
    
    /**
     * Distribute a loan payment to all investors
     * @param {string} loanId - Loan ID
     * @param {Object} payment - Payment details
     * @returns {Array} Returns breakdown for each investor
     */
    async distributePaymentToInvestors(loanId, payment) {
        try {
            // Get all investors for this loan
            const response = await this.apiRequest(`/loans/${loanId}/investors`);
            
            if (!response.success || !response.data) {
                throw new Error('Failed to get loan investors');
            }
            
            const investors = response.data;
            const distributions = [];
            
            // Calculate returns for each investor
            for (const investment of investors) {
                const returns = this.calculateInvestorReturns(investment, payment);
                distributions.push(returns);
                
                // Update investor's returns in database
                await this.updateInvestorReturns(returns);
                
                // Send notification to investor
                await this.notifyInvestor(returns);
            }
            
            console.log(`✅ Distributed payment to ${distributions.length} investors`);
            return distributions;
            
        } catch (error) {
            console.error('❌ Error distributing payment:', error);
            throw error;
        }
    },
    
    /**
     * Update investor's returns in database
     */
    async updateInvestorReturns(returns) {
        try {
            await this.apiRequest(`/investments/${returns.investmentId}/returns`, {
                method: 'POST',
                body: JSON.stringify({
                    payment_received: returns.netReturn,
                    total_returns: returns.newTotalReturns,
                    net_profit: returns.netProfit,
                    roi: returns.roi,
                    progress: returns.progressPercentage,
                    payment_date: returns.paymentDate
                })
            });
        } catch (error) {
            console.error('Failed to update investor returns:', error);
        }
    },
    
    /**
     * Notify investor about received returns
     */
    async notifyInvestor(returns) {
        try {
            const message = this.formatReturnNotification(returns);
            
            await this.apiRequest('/notifications', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: returns.investorId,
                    type: 'return_received',
                    title: 'Investment Return Received',
                    message: message,
                    data: returns
                })
            });
        } catch (error) {
            console.error('Failed to notify investor:', error);
        }
    },
    
    /**
     * Format return notification message
     */
    formatReturnNotification(returns) {
        const profit = returns.netProfit >= 0 ? 'profit' : 'progress';
        return `
You received $${returns.netReturn.toFixed(2)} from ${returns.borrowerName}'s loan payment.

Your Investment: $${returns.investmentAmount.toFixed(2)} (${returns.investmentPercentage}% of loan)
Total Received: $${returns.newTotalReturns.toFixed(2)}
Net ${profit}: ${returns.netProfit >= 0 ? '+' : ''}$${returns.netProfit.toFixed(2)} (${returns.roi.toFixed(2)}% ROI)
Progress: ${returns.progressPercentage.toFixed(1)}%

${returns.paymentsRemaining > 0 ? `${returns.paymentsRemaining} payments remaining` : 'Investment complete! 🎉'}
        `.trim();
    },
    
    /**
     * Get investor's returns dashboard
     */
    async getInvestorReturnsDashboard(investorId) {
        try {
            const response = await this.apiRequest(`/investors/${investorId}/returns`);
            
            if (!response.success) {
                throw new Error('Failed to get returns dashboard');
            }
            
            const data = response.data;
            
            return {
                summary: {
                    totalInvested: parseFloat(data.total_invested || 0),
                    totalReturnsReceived: parseFloat(data.total_returns_received || 0),
                    totalFeesPaid: parseFloat(data.total_fees_paid || 0),
                    netProfit: parseFloat(data.net_profit || 0),
                    averageROI: parseFloat(data.average_roi || 0),
                    activeInvestments: parseInt(data.active_investments || 0),
                    completedInvestments: parseInt(data.completed_investments || 0)
                },
                recentReturns: data.recent_returns || [],
                upcomingPayments: data.upcoming_payments || [],
                investments: data.investments || []
            };
        } catch (error) {
            console.error('Failed to get returns dashboard:', error);
            throw error;
        }
    },
    
    /**
     * Display returns dashboard UI
     */
    async displayReturnsDashboard(investorId) {
        try {
            const dashboard = await this.getInvestorReturnsDashboard(investorId);
            
            // Update summary cards
            this.updateSummaryCards(dashboard.summary);
            
            // Display recent returns
            this.displayRecentReturns(dashboard.recentReturns);
            
            // Display upcoming payments
            this.displayUpcomingPayments(dashboard.upcomingPayments);
            
            // Display investment breakdown
            this.displayInvestmentBreakdown(dashboard.investments);
            
        } catch (error) {
            console.error('Failed to display returns dashboard:', error);
            this.showError('Failed to load returns dashboard');
        }
    },
    
    /**
     * Update summary cards
     */
    updateSummaryCards(summary) {
        const cards = {
            totalInvested: document.getElementById('totalInvestedAmount'),
            totalReturns: document.getElementById('totalReturnsReceived'),
            netProfit: document.getElementById('netProfitAmount'),
            averageROI: document.getElementById('averageROI')
        };
        
        if (cards.totalInvested) {
            cards.totalInvested.textContent = `$${summary.totalInvested.toLocaleString()}`;
        }
        
        if (cards.totalReturns) {
            cards.totalReturns.textContent = `$${summary.totalReturnsReceived.toLocaleString()}`;
        }
        
        if (cards.netProfit) {
            const color = summary.netProfit >= 0 ? '#38e77b' : '#ef4444';
            cards.netProfit.textContent = `${summary.netProfit >= 0 ? '+' : ''}$${summary.netProfit.toLocaleString()}`;
            cards.netProfit.style.color = color;
        }
        
        if (cards.averageROI) {
            const color = summary.averageROI >= 0 ? '#38e77b' : '#ef4444';
            cards.averageROI.textContent = `${summary.averageROI >= 0 ? '+' : ''}${summary.averageROI.toFixed(2)}%`;
            cards.averageROI.style.color = color;
        }
    },
    
    /**
     * Display recent returns
     */
    displayRecentReturns(returns) {
        const container = document.getElementById('recentReturnsContainer');
        if (!container) return;
        
        if (returns.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <p>No returns received yet</p>
                </div>
            `;
            return;
        }
        
        const html = returns.map(ret => `
            <div class="return-item" style="background: #0f172a; padding: 20px; border-radius: 12px; margin-bottom: 15px; border-left: 4px solid #38e77b;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <div>
                        <h4 style="margin: 0 0 5px 0; color: #fff;">${ret.borrower_name}</h4>
                        <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                            ${ret.loan_purpose || 'Personal Loan'} • Payment #${ret.payment_number}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 24px; font-weight: 700; color: #38e77b;">
                            +$${parseFloat(ret.amount_received).toFixed(2)}
                        </div>
                        <div style="color: #94a3b8; font-size: 12px;">
                            ${this.formatDate(ret.received_date)}
                        </div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #1e293b;">
                    <div>
                        <div style="color: #94a3b8; font-size: 12px; margin-bottom: 5px;">Your Share</div>
                        <div style="color: #fff; font-weight: 600;">${ret.investment_percentage}%</div>
                    </div>
                    <div>
                        <div style="color: #94a3b8; font-size: 12px; margin-bottom: 5px;">Total Received</div>
                        <div style="color: #fff; font-weight: 600;">$${parseFloat(ret.total_received).toFixed(2)}</div>
                    </div>
                    <div>
                        <div style="color: #94a3b8; font-size: 12px; margin-bottom: 5px;">ROI</div>
                        <div style="color: ${ret.roi >= 0 ? '#38e77b' : '#ef4444'}; font-weight: 600;">
                            ${ret.roi >= 0 ? '+' : ''}${parseFloat(ret.roi).toFixed(2)}%
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    },
    
    /**
     * Display upcoming payments
     */
    displayUpcomingPayments(payments) {
        const container = document.getElementById('upcomingPaymentsContainer');
        if (!container) return;
        
        if (payments.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-calendar-check" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <p>No upcoming payments</p>
                </div>
            `;
            return;
        }
        
        const html = payments.map(payment => {
            const daysUntil = this.getDaysUntil(payment.due_date);
            const urgency = daysUntil <= 3 ? 'urgent' : daysUntil <= 7 ? 'soon' : 'normal';
            const colors = {
                urgent: '#ef4444',
                soon: '#fb923c',
                normal: '#3b82f6'
            };
            
            return `
                <div class="upcoming-payment" style="background: #0f172a; padding: 20px; border-radius: 12px; margin-bottom: 15px; border-left: 4px solid ${colors[urgency]};">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 5px 0; color: #fff;">${payment.borrower_name}</h4>
                            <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 14px;">
                                ${payment.loan_purpose || 'Personal Loan'}
                            </p>
                            <div style="display: flex; gap: 20px; font-size: 14px;">
                                <div>
                                    <span style="color: #94a3b8;">Due:</span>
                                    <span style="color: #fff; font-weight: 600;">${this.formatDate(payment.due_date)}</span>
                                </div>
                                <div>
                                    <span style="color: #94a3b8;">In:</span>
                                    <span style="color: ${colors[urgency]}; font-weight: 600;">${daysUntil} days</span>
                                </div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 20px; font-weight: 700; color: #38e77b;">
                                ~$${parseFloat(payment.expected_amount).toFixed(2)}
                            </div>
                            <div style="color: #94a3b8; font-size: 12px;">
                                Your share (${payment.investment_percentage}%)
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    },
    
    /**
     * Display investment breakdown
     */
    displayInvestmentBreakdown(investments) {
        const container = document.getElementById('investmentBreakdownContainer');
        if (!container) return;
        
        if (investments.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-chart-pie" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <p>No active investments</p>
                </div>
            `;
            return;
        }
        
        const html = investments.map(inv => {
            const progress = parseFloat(inv.progress || 0);
            const roi = parseFloat(inv.roi || 0);
            const status = inv.status || 'active';
            
            const statusColors = {
                active: '#3b82f6',
                completed: '#38e77b',
                defaulted: '#ef4444'
            };
            
            return `
                <div class="investment-card" style="background: #0f172a; padding: 20px; border-radius: 12px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <div>
                            <h4 style="margin: 0 0 5px 0; color: #fff;">${inv.borrower_name}</h4>
                            <p style="margin: 0; color: #94a3b8; font-size: 14px;">${inv.loan_purpose || 'Personal Loan'}</p>
                        </div>
                        <span style="padding: 4px 12px; background: rgba(${statusColors[status] === '#38e77b' ? '56, 231, 123' : statusColors[status] === '#ef4444' ? '239, 68, 68' : '59, 130, 246'}, 0.1); color: ${statusColors[status]}; border-radius: 6px; font-size: 12px; font-weight: 600;">
                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 15px;">
                        <div>
                            <div style="color: #94a3b8; font-size: 12px; margin-bottom: 5px;">Invested</div>
                            <div style="color: #fff; font-weight: 600;">$${parseFloat(inv.amount).toFixed(2)}</div>
                        </div>
                        <div>
                            <div style="color: #94a3b8; font-size: 12px; margin-bottom: 5px;">Received</div>
                            <div style="color: #fff; font-weight: 600;">$${parseFloat(inv.total_received || 0).toFixed(2)}</div>
                        </div>
                        <div>
                            <div style="color: #94a3b8; font-size: 12px; margin-bottom: 5px;">Expected</div>
                            <div style="color: #fff; font-weight: 600;">$${parseFloat(inv.expected_returns).toFixed(2)}</div>
                        </div>
                        <div>
                            <div style="color: #94a3b8; font-size: 12px; margin-bottom: 5px;">ROI</div>
                            <div style="color: ${roi >= 0 ? '#38e77b' : '#ef4444'}; font-weight: 600;">
                                ${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="color: #94a3b8; font-size: 12px;">Progress</span>
                            <span style="color: #fff; font-size: 12px; font-weight: 600;">${progress.toFixed(1)}%</span>
                        </div>
                        <div style="background: #1e293b; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="background: linear-gradient(90deg, #38e77b, #3b82f6); height: 100%; width: ${progress}%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    },
    
    /**
     * Helper: Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },
    
    /**
     * Helper: Get days until date
     */
    getDaysUntil(dateString) {
        const today = new Date();
        const targetDate = new Date(dateString);
        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    },
    
    /**
     * API request helper
     */
    async apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        
        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `API Error: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API Request failed for ${endpoint}:`, error);
            throw error;
        }
    },
    
    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        // You can implement a toast notification here
    }
};

// Make available globally
window.ReturnsDistribution = ReturnsDistribution;

// Auto-load returns dashboard if on returns page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const returnsSection = document.getElementById('returns-section');
        if (returnsSection && !returnsSection.classList.contains('hidden')) {
            const userId = localStorage.getItem('userId');
            if (userId) {
                ReturnsDistribution.displayReturnsDashboard(userId);
            }
        }
    });
}
