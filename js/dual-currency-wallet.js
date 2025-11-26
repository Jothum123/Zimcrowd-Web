/**
 * Dual Currency Wallet System
 * Support for USD and ZWG balances
 */

// ==================== WALLET DATA STRUCTURE ====================

const WalletManager = {
    balances: {
        USD: 0,
        ZWG: 0
    },
    
    selectedCurrency: 'USD', // Default display currency
    
    exchangeRate: 0.0392, // ZWG to USD rate: 1 ZWG = 0.0392 USD (25.51 ZWG = 1 USD)
    
    // Initialize wallet
    async init() {
        await this.loadBalances();
        await this.loadExchangeRate();
        this.updateDisplay();
        this.setupCurrencySwitcher();
    },
    
    // Load balances from API
    async loadBalances() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/wallet/balances`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.balances.USD = data.balances.USD || 0;
                this.balances.ZWG = data.balances.ZWG || 0;
            }
        } catch (error) {
            console.error('Error loading wallet balances:', error);
        }
    },
    
    // Load exchange rate
    async loadExchangeRate() {
        try {
            const response = await fetch(`${API_BASE}/api/exchange-rate/ZWG-USD`);
            const data = await response.json();
            
            if (data.success) {
                this.exchangeRate = data.rate;
            }
        } catch (error) {
            console.error('Error loading exchange rate:', error);
            // Use official rate if API fails
            this.exchangeRate = 0.0392; // Official rate: 1 ZWG = 0.0392 USD
        }
    },
    
    // Update wallet display
    updateDisplay() {
        this.updateMainBalance();
        this.updateCurrencyCards();
        this.updateWalletPage();
    },
    
    // Update main balance display (top stat card)
    updateMainBalance() {
        const walletBalanceEl = document.getElementById('walletBalance');
        if (!walletBalanceEl) return;
        
        const balance = this.balances[this.selectedCurrency];
        const symbol = this.getCurrencySymbol(this.selectedCurrency);
        
        walletBalanceEl.innerHTML = `
            <span style="font-size: 0.6em; color: #94a3b8; font-weight: 400;">${this.selectedCurrency}</span>
            ${symbol}${this.formatAmount(balance, this.selectedCurrency)}
        `;
    },
    
    // Update currency cards
    updateCurrencyCards() {
        const container = document.getElementById('currencyCardsContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="currency-cards">
                ${this.createCurrencyCard('USD', this.balances.USD)}
                ${this.createCurrencyCard('ZWG', this.balances.ZWG)}
            </div>
        `;
    },
    
    // Create currency card HTML
    createCurrencyCard(currency, balance) {
        const symbol = this.getCurrencySymbol(currency);
        const isSelected = currency === this.selectedCurrency;
        
        return `
            <div class="currency-card ${isSelected ? 'selected' : ''}" onclick="WalletManager.selectCurrency('${currency}')">
                <div class="currency-header">
                    <div class="currency-flag">
                        ${this.getCurrencyFlag(currency)}
                    </div>
                    <div class="currency-info">
                        <div class="currency-code">${currency}</div>
                        <div class="currency-name">${this.getCurrencyName(currency)}</div>
                    </div>
                    ${isSelected ? '<i class="fas fa-check-circle" style="color: #38e77b;"></i>' : ''}
                </div>
                <div class="currency-balance">
                    <div class="balance-amount">${symbol}${this.formatAmount(balance, currency)}</div>
                    ${this.getEquivalentDisplay(currency, balance)}
                </div>
                <div class="currency-actions">
                    <button onclick="WalletManager.deposit('${currency}')" class="btn-currency-action">
                        <i class="fas fa-plus"></i> Deposit
                    </button>
                    <button onclick="WalletManager.withdraw('${currency}')" class="btn-currency-action">
                        <i class="fas fa-minus"></i> Withdraw
                    </button>
                </div>
            </div>
        `;
    },
    
    // Get equivalent amount in other currency
    getEquivalentDisplay(currency, balance) {
        if (balance === 0) return '';
        
        let equivalent = 0;
        let equivalentCurrency = '';
        
        if (currency === 'USD') {
            equivalent = balance / this.exchangeRate;
            equivalentCurrency = 'ZWG';
        } else {
            equivalent = balance * this.exchangeRate;
            equivalentCurrency = 'USD';
        }
        
        const symbol = this.getCurrencySymbol(equivalentCurrency);
        return `<div class="balance-equivalent">≈ ${symbol}${this.formatAmount(equivalent, equivalentCurrency)}</div>`;
    },
    
    // Setup currency switcher in header
    setupCurrencySwitcher() {
        const walletBalanceEl = document.getElementById('walletBalance');
        if (!walletBalanceEl) return;
        
        // Make it clickable to toggle currency
        walletBalanceEl.style.cursor = 'pointer';
        walletBalanceEl.title = 'Click to switch currency';
        
        walletBalanceEl.onclick = () => {
            this.toggleCurrency();
        };
    },
    
    // Toggle between USD and ZWG
    toggleCurrency() {
        this.selectedCurrency = this.selectedCurrency === 'USD' ? 'ZWG' : 'USD';
        this.updateDisplay();
    },
    
    // Select specific currency
    selectCurrency(currency) {
        this.selectedCurrency = currency;
        this.updateDisplay();
    },
    
    // Format amount based on currency
    formatAmount(amount, currency) {
        if (currency === 'USD') {
            return amount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } else {
            // ZWG - no decimals
            return amount.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        }
    },
    
    // Get currency symbol
    getCurrencySymbol(currency) {
        return {
            'USD': '$',
            'ZWG': 'Z$'
        }[currency] || '$';
    },
    
    // Get currency flag emoji
    getCurrencyFlag(currency) {
        return {
            'USD': '🇺🇸',
            'ZWG': '🇿🇼'
        }[currency] || '💰';
    },
    
    // Get currency full name
    getCurrencyName(currency) {
        return {
            'USD': 'US Dollar',
            'ZWG': 'Zimbabwe Gold'
        }[currency] || currency;
    },
    
    // Update wallet page transactions
    updateWalletPage() {
        // This will be called when on the wallet page
        const walletPageContainer = document.getElementById('walletTransactions');
        if (!walletPageContainer) return;
        
        // Filter transactions by selected currency
        this.loadTransactions(this.selectedCurrency);
    },
    
    // Load transactions for specific currency
    async loadTransactions(currency) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/wallet/transactions?currency=${currency}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayTransactions(data.transactions);
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    },
    
    // Display transactions
    displayTransactions(transactions) {
        const container = document.getElementById('walletTransactions');
        if (!container) return;
        
        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt" style="font-size: 48px; color: #475569; margin-bottom: 16px;"></i>
                    <p style="color: #94a3b8;">No transactions yet in ${this.selectedCurrency}</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = transactions.map(tx => this.createTransactionRow(tx)).join('');
    },
    
    // Create transaction row
    createTransactionRow(tx) {
        const symbol = this.getCurrencySymbol(tx.currency);
        const isCredit = tx.type === 'credit';
        const icon = isCredit ? 'arrow-down' : 'arrow-up';
        const color = isCredit ? '#38e77b' : '#ef4444';
        
        return `
            <div class="transaction-row">
                <div class="transaction-icon" style="background: ${color}20;">
                    <i class="fas fa-${icon}" style="color: ${color};"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-title">${tx.description}</div>
                    <div class="transaction-date">${new Date(tx.created_at).toLocaleDateString()}</div>
                </div>
                <div class="transaction-amount" style="color: ${color};">
                    ${isCredit ? '+' : '-'}${symbol}${this.formatAmount(Math.abs(tx.amount), tx.currency)}
                </div>
            </div>
        `;
    },
    
    // Deposit to specific currency
    deposit(currency) {
        // Update deposit modal to pre-select currency
        showDepositModal();
        
        // Wait for modal to render
        setTimeout(() => {
            const currencySelect = document.getElementById('depositCurrency');
            if (currencySelect) {
                currencySelect.value = currency;
                updateCurrencyLimits();
            }
        }, 100);
    },
    
    // Withdraw from specific currency
    withdraw(currency) {
        showWithdrawModal(currency);
    },
    
    // Get total balance in USD
    getTotalBalanceUSD() {
        return this.balances.USD + (this.balances.ZWG * this.exchangeRate);
    },
    
    // Get total balance in ZWG
    getTotalBalanceZWG() {
        return this.balances.ZWG + (this.balances.USD / this.exchangeRate);
    },
    
    // Credit wallet (after successful payment)
    async creditWallet(amount, currency, reference) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/wallet/credit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount,
                    currency,
                    reference,
                    description: `Deposit via Paynow`
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Update local balance
                this.balances[currency] = data.newBalance;
                this.updateDisplay();
                
                // Show success notification
                showNotification(
                    'Wallet Credited!',
                    `${this.getCurrencySymbol(currency)}${this.formatAmount(amount, currency)} added to your ${currency} wallet`,
                    'success'
                );
            }
            
            return data;
        } catch (error) {
            console.error('Error crediting wallet:', error);
            return { success: false, error: error.message };
        }
    }
};

// ==================== CURRENCY CARDS STYLES ====================

const currencyCardStyles = `
<style>
    .currency-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin: 20px 0;
    }
    
    .currency-card {
        background: #1e293b;
        border: 2px solid #334155;
        border-radius: 16px;
        padding: 24px;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .currency-card:hover {
        border-color: #38e77b;
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(56, 231, 123, 0.1);
    }
    
    .currency-card.selected {
        border-color: #38e77b;
        background: rgba(56, 231, 123, 0.05);
    }
    
    .currency-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
    }
    
    .currency-flag {
        font-size: 32px;
    }
    
    .currency-info {
        flex: 1;
    }
    
    .currency-code {
        font-size: 18px;
        font-weight: 700;
        color: white;
    }
    
    .currency-name {
        font-size: 13px;
        color: #94a3b8;
    }
    
    .currency-balance {
        margin-bottom: 20px;
    }
    
    .balance-amount {
        font-size: 32px;
        font-weight: 700;
        color: white;
        margin-bottom: 8px;
    }
    
    .balance-equivalent {
        font-size: 14px;
        color: #94a3b8;
    }
    
    .currency-actions {
        display: flex;
        gap: 10px;
    }
    
    .btn-currency-action {
        flex: 1;
        padding: 10px;
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 8px;
        color: white;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
    }
    
    .btn-currency-action:hover {
        background: #38e77b;
        border-color: #38e77b;
        color: #0f172a;
    }
    
    .transaction-row {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: #1e293b;
        border-radius: 12px;
        margin-bottom: 12px;
    }
    
    .transaction-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .transaction-details {
        flex: 1;
    }
    
    .transaction-title {
        color: white;
        font-weight: 600;
        margin-bottom: 4px;
    }
    
    .transaction-date {
        color: #94a3b8;
        font-size: 13px;
    }
    
    .transaction-amount {
        font-size: 18px;
        font-weight: 700;
    }
    
    .empty-state {
        text-align: center;
        padding: 60px 20px;
    }
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', currencyCardStyles);

// ==================== INITIALIZATION ====================

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    WalletManager.init();
    console.log('✅ Dual currency wallet initialized');
});

// Refresh balances every 30 seconds
setInterval(() => {
    WalletManager.loadBalances();
    WalletManager.updateDisplay();
}, 30000);
