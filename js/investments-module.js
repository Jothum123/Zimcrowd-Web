/**
 * Investments Module
 * Portfolio display, charts, and secondary market selling
 */

const InvestmentsModule = {
    investmentsData: null,
    performanceChart: null,
    
    async loadInvestments() {
        const container = document.getElementById('investmentsContent');
        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading investments...</p></div>';
        
        try {
            this.investmentsData = await window.DashboardData.fetchInvestments();
            await this.renderInvestments();
        } catch (error) {
            console.error('Error loading investments:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--danger);">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Failed to load investments</p>
                    <button class="btn btn-primary" onclick="InvestmentsModule.loadInvestments()">Retry</button>
                </div>
            `;
        }
    },
    
    async renderInvestments() {
        const container = document.getElementById('investmentsContent');
        const investments = this.investmentsData?.investments || [];
        
        if (investments.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-chart-line" style="font-size: 4rem; color: var(--text-secondary); opacity: 0.3; margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--text-secondary); margin-bottom: 1rem;">No Investments Yet</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem;">Start investing to grow your wealth</p>
                    <button class="btn btn-primary" onclick="InvestmentsModule.showInvestModal()">
                        <i class="fas fa-plus"></i> Start Investing
                    </button>
                </div>
            `;
            return;
        }
        
        // Calculate totals
        const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const totalValue = investments.reduce((sum, inv) => sum + (inv.current_value || inv.amount), 0);
        const totalReturns = totalValue - totalInvested;
        const returnPercent = (totalReturns / totalInvested) * 100;
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">Total Invested</span>
                        <div class="stat-icon investments">
                            <i class="fas fa-coins"></i>
                        </div>
                    </div>
                    <div class="stat-value">${window.DashboardCore.formatCurrency(totalInvested)}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">Current Value</span>
                        <div class="stat-icon success">
                            <i class="fas fa-chart-line"></i>
                        </div>
                    </div>
                    <div class="stat-value">${window.DashboardCore.formatCurrency(totalValue)}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">Total Returns</span>
                        <div class="stat-icon ${totalReturns >= 0 ? 'success' : 'danger'}">
                            <i class="fas fa-arrow-${totalReturns >= 0 ? 'up' : 'down'}"></i>
                        </div>
                    </div>
                    <div class="stat-value">${window.DashboardCore.formatCurrency(totalReturns)}</div>
                    <div class="stat-change ${totalReturns >= 0 ? 'positive' : 'negative'}">
                        ${returnPercent.toFixed(2)}% return
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem;">Performance Chart</h3>
                <canvas id="performanceChart" style="max-height: 300px;"></canvas>
            </div>
            
            <h3 style="margin-bottom: 1rem;">Your Investments</h3>
            <div style="display: grid; gap: 1.5rem;">
                ${investments.map(inv => this.renderInvestmentCard(inv)).join('')}
            </div>
        `;
        
        this.renderPerformanceChart();
    },
    
    renderInvestmentCard(investment) {
        const returns = (investment.current_value || investment.amount) - investment.amount;
        const returnPercent = (returns / investment.amount) * 100;
        
        return `
            <div class="card" style="padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="margin-bottom: 0.5rem;">${investment.loan_title || 'Investment'}</h3>
                        <span class="badge ${window.DashboardCore.getStatusBadgeClass(investment.status)}">${investment.status}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">
                            ${window.DashboardCore.formatCurrency(investment.current_value || investment.amount)}
                        </div>
                        <div style="font-size: 0.85rem; color: ${returns >= 0 ? 'var(--success)' : 'var(--danger)'};">
                            ${returns >= 0 ? '+' : ''}${window.DashboardCore.formatCurrency(returns)} (${returnPercent.toFixed(2)}%)
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem; padding: 1rem; background: var(--light); border-radius: 8px;">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Invested Amount</div>
                        <div style="font-weight: 600;">${window.DashboardCore.formatCurrency(investment.amount)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Expected Return</div>
                        <div style="font-weight: 600;">${investment.expected_return || 'N/A'}%</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Investment Date</div>
                        <div style="font-weight: 600;">${window.DashboardCore.formatDate(investment.invested_at)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Maturity Date</div>
                        <div style="font-weight: 600;">${window.DashboardCore.formatDate(investment.maturity_date)}</div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.75rem;">
                    <button class="btn btn-outline" onclick="InvestmentsModule.showInvestmentDetails('${investment.id}')">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                    <button class="btn btn-secondary" onclick="InvestmentsModule.showSellModal('${investment.id}', ${investment.current_value || investment.amount})">
                        <i class="fas fa-exchange-alt"></i> Sell to Secondary Market
                    </button>
                </div>
            </div>
        `;
    },
    
    async renderPerformanceChart() {
        try {
            const performance = await window.DashboardData.fetchInvestmentPerformance();
            const ctx = document.getElementById('performanceChart');
            
            if (!ctx) return;
            
            if (this.performanceChart) {
                this.performanceChart.destroy();
            }
            
            this.performanceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: performance?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Portfolio Value',
                        data: performance?.values || [1000, 1200, 1150, 1400, 1600, 1800],
                        borderColor: 'rgb(56, 224, 123)',
                        backgroundColor: 'rgba(56, 224, 123, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering chart:', error);
        }
    },
    
    showInvestmentDetails(investmentId) {
        // TODO: Implement investment details modal
        window.DashboardCore.showSuccess('Investment details coming soon!');
    },
    
    showSellModal(investmentId, currentValue) {
        const modal = document.createElement('div');
        modal.className = 'modal open';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">Sell to Secondary Market</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                        List your investment on the secondary market for other investors to purchase.
                    </p>
                    
                    <div class="form-group">
                        <label class="form-label">Selling Price (USD)</label>
                        <input type="number" class="form-input" id="sellingPrice" value="${currentValue}" min="1" step="0.01">
                        <small style="color: var(--text-secondary);">Current value: ${window.DashboardCore.formatCurrency(currentValue)}</small>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Reason for Selling (Optional)</label>
                        <textarea class="form-textarea" id="sellReason" placeholder="Enter reason..."></textarea>
                    </div>
                    
                    <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" onclick="InvestmentsModule.processSell('${investmentId}')">
                        <i class="fas fa-check"></i> List for Sale
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modalsContainer').appendChild(modal);
    },
    
    async processSell(investmentId) {
        const price = document.getElementById('sellingPrice').value;
        const reason = document.getElementById('sellReason').value;
        
        if (!price || parseFloat(price) < 1) {
            window.DashboardCore.showError('Please enter a valid price');
            return;
        }
        
        try {
            const result = await window.DashboardData.sellInvestment(investmentId, {
                price: parseFloat(price),
                reason
            });
            
            if (result.success) {
                window.DashboardCore.showSuccess('Investment listed for sale successfully!');
                document.querySelector('.modal').remove();
                this.loadInvestments();
            } else {
                window.DashboardCore.showError(result.message || 'Failed to list investment');
            }
        } catch (error) {
            console.error('Sell error:', error);
            window.DashboardCore.showError('Failed to process sale');
        }
    },
    
    showInvestModal() {
        // TODO: Implement new investment modal
        window.DashboardCore.showSuccess('New investment feature coming soon!');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('newInvestmentBtn')?.addEventListener('click', () => {
        InvestmentsModule.showInvestModal();
    });
});

window.InvestmentsModule = InvestmentsModule;
console.log('✅ Investments Module loaded');
