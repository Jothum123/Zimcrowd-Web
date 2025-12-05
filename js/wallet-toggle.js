// Wallet Currency Toggle Module
// Currency configuration for multi-currency support
const CURRENCY_CONFIG = {
    USD: {
        symbol: '$',
        name: 'US Dollar',
        minLoan: 25,
        maxLoan: 3000,
        interestRate: 8,
        color: '#38e77b'
    },
    ZWG: {
        symbol: 'ZWG',
        name: 'Zimbabwe Gold',
        minLoan: 675,
        maxLoan: 40000,
        interestRate: 10,
        color: '#f59e0b'
    }
};

// Wallet currency toggle functionality
let selectedWalletCurrency = 'USD';
let walletData = {
    USD: { total: 0, available: 0, reserved: 0, transactions: 0 },
    ZWG: { total: 0, available: 0, reserved: 0, transactions: 0 }
};

// Switch wallet currency display
function switchWalletCurrency(currency) {
    selectedWalletCurrency = currency;
    
    // Update toggle button states
    const usdBtn = document.getElementById('usd-toggle-btn');
    const zwgBtn = document.getElementById('zwg-toggle-btn');
    
    if (currency === 'USD') {
        usdBtn.classList.add('active');
        zwgBtn.classList.remove('active');
    } else {
        zwgBtn.classList.add('active');
        usdBtn.classList.remove('active');
    }
    
    // Update wallet display
    updateWalletDisplay();
    
    console.log(`🔄 Switched to ${currency} wallet view`);
}

// Update wallet display based on selected currency
function updateWalletDisplay() {
    const currency = selectedWalletCurrency;
    const data = walletData[currency];
    const config = CURRENCY_CONFIG[currency];
    
    if (!data || !config) {
        console.error('❌ Invalid currency or missing data');
        return;
    }
    
    // Add transition effect
    const cards = document.querySelectorAll('#wallet-section .stat-card');
    cards.forEach(card => {
        card.style.opacity = '0.7';
        card.style.transform = 'scale(0.98)';
    });
    
    setTimeout(() => {
        // Update total balance
        const totalBalanceEl = document.getElementById('walletTotalBalance');
        if (totalBalanceEl) {
            totalBalanceEl.textContent = `${config.symbol}${data.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        
        // Update available balance
        const availableBalanceEl = document.getElementById('walletAvailableBalance');
        if (availableBalanceEl) {
            availableBalanceEl.textContent = `${config.symbol}${data.available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        
        // Update reserved balance
        const reservedBalanceEl = document.getElementById('walletReservedBalance');
        if (reservedBalanceEl) {
            reservedBalanceEl.textContent = `${config.symbol}${data.reserved.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        
        // Update total transactions
        const transactionsEl = document.getElementById('walletTotalTransactions');
        if (transactionsEl) {
            transactionsEl.textContent = `${config.symbol}${data.transactions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        
        // Update currency labels
        const labels = [
            'wallet-currency-label',
            'available-currency-label',
            'reserved-currency-label',
            'transactions-currency-label'
        ];
        
        labels.forEach(labelId => {
            const labelEl = document.getElementById(labelId);
            if (labelEl) {
                labelEl.textContent = currency;
                labelEl.style.color = config.color;
            }
        });
        
        // Update featured card color
        const featuredCard = document.querySelector('.featured-balance-card');
        if (featuredCard) {
            featuredCard.style.background = `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`;
            featuredCard.style.boxShadow = `0 8px 32px ${config.color}33`;
        }
        
        // Remove transition effect
        cards.forEach(card => {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
        });
        
        console.log(`✅ Wallet display updated for ${currency}:`, data);
    }, 150);
}
