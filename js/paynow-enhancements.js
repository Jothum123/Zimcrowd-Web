/**
 * Paynow Integration Enhancements
 * Additional features for improved payment experience
 */

// ==================== FEATURE 1: Payment Status Modal ====================

function showPaymentStatusModal(reference, pollUrl) {
    const modal = document.createElement('div');
    modal.id = 'paymentStatusModal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 10001;">
            <div style="background: #1e293b; border-radius: 20px; padding: 40px; max-width: 450px; width: 90%;">
                <div style="text-align: center;">
                    <div id="statusIndicator" style="margin-bottom: 30px;">
                        <div class="spinner-large" style="width: 80px; height: 80px; border: 4px solid #334155; border-top-color: #38e77b; border-radius: 50%; margin: 0 auto 20px; animation: spin 1s linear infinite;"></div>
                        <h3 style="color: white; margin: 0 0 10px 0;">Processing Payment</h3>
                        <p style="color: #94a3b8; margin: 0;">Please wait while we confirm your payment...</p>
                    </div>
                    
                    <div id="statusDetails" style="background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: left;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #94a3b8;">Reference:</span>
                            <span style="color: white; font-family: monospace;">${reference}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #94a3b8;">Status:</span>
                            <span id="currentStatus" style="color: #fbbf24; font-weight: 600;">Pending</span>
                        </div>
                    </div>
                    
                    <div id="statusProgress" style="width: 100%; height: 4px; background: #334155; border-radius: 2px; overflow: hidden; margin-bottom: 20px;">
                        <div id="progressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38e77b, #22c55e); transition: width 0.3s;"></div>
                    </div>
                    
                    <button onclick="closePaymentStatusModal()" style="width: 100%; padding: 12px; background: #334155; border: none; border-radius: 12px; color: white; cursor: pointer; font-size: 14px;">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // Start polling
    pollPaymentStatusEnhanced(reference, pollUrl);
}

async function pollPaymentStatusEnhanced(reference, pollUrl) {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes
    let delay = 3000; // Start with 3 seconds
    
    const poll = async () => {
        try {
            attempts++;
            
            // Update progress bar
            const progress = Math.min((attempts / maxAttempts) * 100, 95);
            const progressBar = document.getElementById('progressBar');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            
            // Check status
            const response = await fetch(`${API_BASE}/api/payments/status/${reference}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            // Update status display
            updateStatusDisplay(data.status);
            
            // Check if final status
            if (['Paid', 'Failed', 'Cancelled'].includes(data.status)) {
                handleFinalStatus(data);
                return;
            }
            
            // Continue polling if not max attempts
            if (attempts < maxAttempts) {
                setTimeout(poll, delay);
                delay = Math.min(delay * 1.1, 10000); // Exponential backoff, max 10s
            } else {
                handleTimeout();
            }
            
        } catch (error) {
            console.error('Polling error:', error);
            handlePollingError(error);
        }
    };
    
    poll();
}

function updateStatusDisplay(status) {
    const statusElement = document.getElementById('currentStatus');
    if (!statusElement) return;
    
    const statusConfig = {
        'Pending': { color: '#fbbf24', text: 'Pending' },
        'Sent': { color: '#3b82f6', text: 'Processing' },
        'Paid': { color: '#38e77b', text: 'Paid ✓' },
        'Failed': { color: '#ef4444', text: 'Failed' },
        'Cancelled': { color: '#94a3b8', text: 'Cancelled' }
    };
    
    const config = statusConfig[status] || statusConfig['Pending'];
    statusElement.style.color = config.color;
    statusElement.textContent = config.text;
}

function handleFinalStatus(data) {
    const modal = document.getElementById('paymentStatusModal');
    if (!modal) return;
    
    const indicator = document.getElementById('statusIndicator');
    const progressBar = document.getElementById('progressBar');
    
    if (progressBar) {
        progressBar.style.width = '100%';
    }
    
    if (data.status === 'Paid') {
        // Success
        indicator.innerHTML = `
            <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(56, 231, 123, 0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                <i class="fas fa-check" style="font-size: 40px; color: #38e77b;"></i>
            </div>
            <h3 style="color: #38e77b; margin: 0 0 10px 0;">Payment Successful! 🎉</h3>
            <p style="color: #94a3b8; margin: 0;">Your wallet has been credited</p>
        `;
        
        // Show notification
        showNotification('Payment Successful!', `$${data.amount} added to wallet`, 'success');
        
        // Refresh wallet balance
        setTimeout(() => {
            loadWalletBalance();
            closePaymentStatusModal();
        }, 3000);
        
    } else {
        // Failed or Cancelled
        indicator.innerHTML = `
            <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(239, 68, 68, 0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                <i class="fas fa-times" style="font-size: 40px; color: #ef4444;"></i>
            </div>
            <h3 style="color: #ef4444; margin: 0 0 10px 0;">Payment ${data.status}</h3>
            <p style="color: #94a3b8; margin: 0;">Please try again or contact support</p>
        `;
    }
}

function handleTimeout() {
    const indicator = document.getElementById('statusIndicator');
    if (indicator) {
        indicator.innerHTML = `
            <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(251, 191, 36, 0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                <i class="fas fa-clock" style="font-size: 40px; color: #fbbf24;"></i>
            </div>
            <h3 style="color: #fbbf24; margin: 0 0 10px 0;">Status Check Timeout</h3>
            <p style="color: #94a3b8; margin: 0;">Please check your wallet balance or contact support</p>
        `;
    }
}

function handlePollingError(error) {
    const indicator = document.getElementById('statusIndicator');
    if (indicator) {
        indicator.innerHTML = `
            <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(239, 68, 68, 0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 40px; color: #ef4444;"></i>
            </div>
            <h3 style="color: #ef4444; margin: 0 0 10px 0;">Connection Error</h3>
            <p style="color: #94a3b8; margin: 0;">Please check your internet connection</p>
        `;
    }
}

function closePaymentStatusModal() {
    const modal = document.getElementById('paymentStatusModal');
    if (modal) {
        modal.remove();
    }
}

// ==================== FEATURE 2: Quick Deposit Amounts ====================

function addQuickAmounts() {
    return `
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 12px; color: #94a3b8;">Quick Amounts</label>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
                <button type="button" onclick="setQuickAmount(5)" class="quick-amount-btn">$5</button>
                <button type="button" onclick="setQuickAmount(10)" class="quick-amount-btn">$10</button>
                <button type="button" onclick="setQuickAmount(20)" class="quick-amount-btn">$20</button>
                <button type="button" onclick="setQuickAmount(50)" class="quick-amount-btn">$50</button>
                <button type="button" onclick="setQuickAmount(100)" class="quick-amount-btn">$100</button>
            </div>
        </div>
        <style>
            .quick-amount-btn {
                padding: 10px;
                background: #0f172a;
                border: 2px solid #334155;
                border-radius: 8px;
                color: white;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s;
            }
            .quick-amount-btn:hover {
                border-color: #38e77b;
                background: rgba(56, 231, 123, 0.1);
            }
            .quick-amount-btn:active {
                transform: scale(0.95);
            }
        </style>
    `;
}

function setQuickAmount(amount) {
    const amountInput = document.getElementById('depositAmount');
    if (amountInput) {
        amountInput.value = amount;
        amountInput.focus();
    }
}

// ==================== FEATURE 3: Save Payment Method ====================

function savePreferredMethod(method, phone = null) {
    localStorage.setItem('preferredPaymentMethod', method);
    if (phone) {
        localStorage.setItem('savedPhone', phone);
    }
    console.log('✅ Payment method saved');
}

function loadPreferredMethod() {
    const preferred = localStorage.getItem('preferredPaymentMethod');
    const savedPhone = localStorage.getItem('savedPhone');
    
    if (preferred) {
        const methodSelect = document.getElementById('depositMethod');
        if (methodSelect) {
            methodSelect.value = preferred;
            togglePaymentFields();
            
            // Load saved phone if applicable
            if (savedPhone && ['ecocash', 'onemoney', 'innbucks'].includes(preferred)) {
                const phoneInput = document.getElementById('depositPhone');
                if (phoneInput) {
                    phoneInput.value = savedPhone;
                }
            }
        }
    }
}

// ==================== FEATURE 4: Browser Notifications ====================

async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }
}

function showNotification(title, body, type = 'info') {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: '/logo.png',
            badge: '/logo.png'
        });
    }
    
    // In-app notification
    showInAppNotification(title, body, type);
}

function showInAppNotification(title, body, type) {
    const colors = {
        success: { bg: '#38e77b', icon: 'check-circle' },
        error: { bg: '#ef4444', icon: 'exclamation-circle' },
        info: { bg: '#3b82f6', icon: 'info-circle' },
        warning: { bg: '#fbbf24', icon: 'exclamation-triangle' }
    };
    
    const config = colors[type] || colors.info;
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${config.bg};
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        z-index: 10002;
        max-width: 350px;
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="fas fa-${config.icon}" style="font-size: 24px;"></i>
            <div>
                <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
                <div style="font-size: 14px; opacity: 0.9;">${body}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Add animations
    if (!document.getElementById('notificationStyles')) {
        const style = document.createElement('style');
        style.id = 'notificationStyles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ==================== FEATURE 5: Currency Switcher ====================

function addCurrencySwitcher() {
    return `
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Currency</label>
            <select id="depositCurrency" onchange="updateCurrencyLimits()" required
                style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;">
                <option value="USD">USD ($) - US Dollar</option>
                <option value="ZWG">ZWG (Z$) - Zimbabwe Gold</option>
            </select>
        </div>
    `;
}

function updateCurrencyLimits() {
    const currency = document.getElementById('depositCurrency').value;
    const amountInput = document.getElementById('depositAmount');
    const limitText = amountInput.nextElementSibling;
    
    if (currency === 'USD') {
        amountInput.min = 1;
        amountInput.max = 10000;
        amountInput.placeholder = 'Enter amount in USD';
        limitText.textContent = 'Min: $1, Max: $10,000';
    } else {
        amountInput.min = 200;
        amountInput.max = 10000000;
        amountInput.placeholder = 'Enter amount in ZWG';
        limitText.textContent = 'Min: Z$200, Max: Z$10,000,000';
    }
}

// ==================== FEATURE 6: Payment Analytics ====================

function trackPaymentEvent(event, data) {
    // Google Analytics (if available)
    if (typeof gtag !== 'undefined') {
        gtag('event', event, {
            'event_category': 'Payment',
            'event_label': data.method,
            'value': data.amount
        });
    }
    
    // Custom analytics
    fetch(`${API_BASE}/api/analytics/payment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            event,
            data,
            timestamp: new Date().toISOString()
        })
    }).catch(err => console.error('Analytics error:', err));
}

// ==================== INITIALIZATION ====================

// Initialize enhancements when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission
    requestNotificationPermission();
    
    console.log('✅ Paynow enhancements loaded');
});
