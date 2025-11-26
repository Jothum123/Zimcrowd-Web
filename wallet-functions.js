// Wallet Functions for Dashboard
// Paynow integration - All sensitive operations handled server-side

// Show Deposit Modal with Paynow payment options
function showDepositModal() {
    const modal = document.createElement('div');
    modal.id = 'depositModal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: #1e293b; border-radius: 20px; padding: 40px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <h2 style="margin: 0;">💰 Add Funds</h2>
                    <button onclick="closeModal('depositModal')" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                
                <form id="depositForm" onsubmit="handleDeposit(event)">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Currency</label>
                        <select id="depositCurrency" required onchange="updateCurrencyLimits()"
                            style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;">
                            <option value="USD">🇺🇸 USD - US Dollar</option>
                            <option value="ZWG">🇿🇼 ZWG - Zimbabwe Gold</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Amount</label>
                        <input type="number" id="depositAmount" min="1" max="10000" step="0.01" required
                            style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;"
                            placeholder="Enter amount">
                        <small id="amountLimits" style="color: #94a3b8; display: block; margin-top: 5px;">Min: $1, Max: $10,000</small>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Payment Method</label>
                        <select id="depositMethod" required onchange="togglePaymentFields()"
                            style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;">
                            <option value="">Select payment method</option>
                            <optgroup label="Paynow (Recommended)">
                                <option value="paynow_web">Paynow Web Checkout</option>
                            </optgroup>
                            <optgroup label="Mobile Money">
                                <option value="ecocash">EcoCash</option>
                                <option value="onemoney">OneMoney</option>
                                <option value="innbucks">InnBucks</option>
                            </optgroup>
                        </select>
                    </div>
                    
                    <!-- Mobile Money Phone Field (hidden by default) -->
                    <div id="mobilePaymentFields" style="display: none; margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Mobile Number</label>
                        <input type="tel" id="depositPhone" 
                            style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;"
                            placeholder="+263771234567"
                            pattern="\+2637[1-9]\d{7}">
                        <small style="color: #64748b; display: block; margin-top: 5px;">
                            <i class="fas fa-info-circle"></i> EcoCash (Econet): +26377... or +26378... | OneMoney (NetOne): +26371...
                        </small>
                    </div>
                    
                    <!-- Email for Paynow Web -->
                    <div id="webPaymentFields" style="display: none; margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Email Address</label>
                        <input type="email" id="depositEmail" 
                            style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;"
                            placeholder="your@email.com">
                        <small style="color: #94a3b8; display: block; margin-top: 5px;">You'll be redirected to Paynow to complete payment</small>
                    </div>
                    
                    <!-- Payment Info Box -->
                    <div id="paymentInfoBox" style="display: none; background: rgba(56, 231, 123, 0.1); border: 1px solid rgba(56, 231, 123, 0.3); border-radius: 12px; padding: 15px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <i class="fas fa-shield-alt" style="color: #38e77b;"></i>
                            <span style="color: #38e77b; font-weight: 600;">Secure Payment</span>
                        </div>
                        <p id="paymentInfoText" style="color: #94a3b8; font-size: 14px; margin: 0;"></p>
                    </div>
                    
                    <button type="submit" class="btn-primary" style="width: 100%; padding: 15px; font-size: 16px;">
                        <span id="depositBtnText">Proceed to Payment</span>
                        <span id="depositBtnSpinner" style="display: none;"><i class="fas fa-spinner fa-spin"></i> Processing...</span>
                    </button>
                </form>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #334155;">
                    <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
                        <i class="fas fa-lock"></i> Payments are securely processed by Paynow Zimbabwe
                    </p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Toggle payment fields based on selected method
function togglePaymentFields() {
    const method = document.getElementById('depositMethod').value;
    const mobileFields = document.getElementById('mobilePaymentFields');
    const webFields = document.getElementById('webPaymentFields');
    const infoBox = document.getElementById('paymentInfoBox');
    const infoText = document.getElementById('paymentInfoText');
    
    // Hide all first
    mobileFields.style.display = 'none';
    webFields.style.display = 'none';
    infoBox.style.display = 'none';
    
    // Reset required
    document.getElementById('depositPhone').required = false;
    document.getElementById('depositEmail').required = false;
    
    const paymentInfo = {
        'ecocash': 'You will receive a prompt on your EcoCash number. Enter your PIN to authorize.',
        'onemoney': 'You will receive a prompt on your OneMoney number. Enter your PIN to authorize.',
        'innbucks': 'You will receive an authorization code. Use the InnBucks app to complete payment.',
        'paynow_web': 'You will be redirected to Paynow\'s secure checkout page.'
    };
    
    if (['ecocash', 'onemoney', 'innbucks'].includes(method)) {
        mobileFields.style.display = 'block';
        document.getElementById('depositPhone').required = true;
        infoBox.style.display = 'block';
        infoText.textContent = paymentInfo[method];
    } else if (method === 'paynow_web') {
        webFields.style.display = 'block';
        document.getElementById('depositEmail').required = true;
        infoBox.style.display = 'block';
        infoText.textContent = paymentInfo[method];
    }
}

// Handle Deposit - Calls backend which handles Paynow securely
async function handleDeposit(event) {
    event.preventDefault();
    
    const amount = document.getElementById('depositAmount').value;
    const method = document.getElementById('depositMethod').value;
    const phone = document.getElementById('depositPhone')?.value;
    const email = document.getElementById('depositEmail')?.value;
    
    // Validation
    if (!amount || parseFloat(amount) < 1) {
        alert('❌ Please enter a valid amount (minimum $1)');
        return;
    }
    
    if (['ecocash', 'onemoney', 'innbucks'].includes(method) && !phone) {
        alert('❌ Please enter your mobile number');
        return;
    }
    
    if (method === 'paynow_web' && !email) {
        alert('❌ Please enter your email address');
        return;
    }
    
    const btnText = document.getElementById('depositBtnText');
    const btnSpinner = document.getElementById('depositBtnSpinner');
    
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline';
    
    try {
        // Get API base URL
        const apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-backend.vercel.app';
        const token = localStorage.getItem('authToken');
        
        // Use existing backend routes
        const isMobileMoney = ['ecocash', 'onemoney', 'innbucks'].includes(method);
        const endpoint = isMobileMoney 
            ? `${apiBase}/api/payments/initiate/mobile`
            : `${apiBase}/api/payments/initiate/web`;
        
        // Call backend Paynow endpoint (server handles all Paynow communication)
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                amount: parseFloat(amount),
                reference: `ZC_WALLET_${Date.now()}`,
                description: 'Wallet Top-up',
                userEmail: email || 'user@zimcrowd.com',
                ...(phone && { userPhone: phone }),
                currency: 'USD',
                userId: localStorage.getItem('userId') || 'guest',
                ...(isMobileMoney && {
                    mobileNumber: phone,
                    paymentMethod: method
                })
            })
        });
        
        const result = await response.json();
        
        // Log error details for debugging
        if (!result.success) {
            console.error('Payment initiation failed:', result);
            console.error('Validation errors:', result.errors);
        }
        
        if (result.success) {
            closeModal('depositModal');
            
            if (method === 'paynow_web' && result.redirectUrl) {
                // Web checkout - open Paynow in new tab
                window.open(result.redirectUrl, '_blank');
                
                // Show payment pending modal with polling
                showPaymentPendingModal(result);
            } else if (method === 'innbucks' && result.authorizationCode) {
                // InnBucks - show authorization code modal
                showInnBucksModal(result);
            } else if (['ecocash', 'onemoney'].includes(method)) {
                // Mobile money - show instructions and poll
                showPaymentInstructionsModal(result);
            } else if (result.pollUrl) {
                // Payment initiated, start polling
                showPaymentPendingModal(result);
            } else {
                alert('✅ Payment initiated! ' + (result.message || 'Please check your phone.'));
            }
        } else {
            alert('❌ Payment failed: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Deposit error:', error);
        alert('❌ Failed to initiate payment. Please try again.');
    } finally {
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
    }
}

// Show InnBucks authorization code modal
function showInnBucksModal(paymentData) {
    const deepLink = `schinn.wbpycode://innbucks.co.zw?pymInnCode=${paymentData.authorizationCode}`;
    const modal = document.createElement('div');
    modal.id = 'innbucksModal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: #1e293b; border-radius: 20px; padding: 40px; max-width: 450px; width: 90%; text-align: center;">
                <div style="width: 80px; height: 80px; background: rgba(168, 85, 247, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fas fa-qrcode" style="font-size: 36px; color: #a855f7;"></i>
                </div>
                
                <h2 style="margin: 0 0 10px 0; color: #a855f7;">InnBucks Payment</h2>
                <p style="color: #94a3b8; margin-bottom: 20px;">Use the code below to complete payment</p>
                
                <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <p style="color: #94a3b8; margin: 0 0 10px 0; font-size: 14px;">Authorization Code</p>
                    <p style="color: #a855f7; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 4px;">${paymentData.authorizationCode}</p>
                    <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px;">Expires: ${paymentData.authorizationExpires || '15 minutes'}</p>
                </div>
                
                <div style="background: rgba(168, 85, 247, 0.1); border-radius: 12px; padding: 15px; margin-bottom: 20px; text-align: left;">
                    <p style="color: #cbd5e1; margin: 0; font-size: 14px;">
                        <strong>How to pay:</strong><br>
                        1. Open InnBucks app<br>
                        2. Go to "Pay"<br>
                        3. Enter the code above<br>
                        4. Confirm payment
                    </p>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="closeModal('innbucksModal')" class="btn-secondary" style="flex: 1;">Close</button>
                    <a href="${deepLink}" class="btn-primary" style="flex: 1; text-decoration: none; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-mobile-alt"></i>&nbsp;Open App
                    </a>
                </div>
                <button onclick="checkPaymentStatus('${paymentData.reference}')" class="btn-primary" style="width: 100%; margin-top: 10px;">
                    <i class="fas fa-sync-alt"></i> Check Status
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Start polling if reference available
    if (paymentData.reference) {
        pollPaymentStatus(paymentData.reference);
    }
}

// Show payment instructions modal for mobile money
function showPaymentInstructionsModal(paymentData) {
    const modal = document.createElement('div');
    modal.id = 'paymentInstructionsModal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: #1e293b; border-radius: 20px; padding: 40px; max-width: 450px; width: 90%; text-align: center;">
                <div style="width: 80px; height: 80px; background: rgba(56, 231, 123, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fas fa-mobile-alt" style="font-size: 36px; color: #38e77b;"></i>
                </div>
                
                <h2 style="margin: 0 0 10px 0; color: #38e77b;">Payment Initiated</h2>
                <p style="color: #94a3b8; margin-bottom: 20px;">Please complete the payment on your phone</p>
                
                <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: left;">
                    <h4 style="margin: 0 0 10px 0; color: white;">Instructions:</h4>
                    <p style="color: #cbd5e1; margin: 0; white-space: pre-line;">${paymentData.instructions || 'Check your phone for the payment prompt and enter your PIN to confirm.'}</p>
                </div>
                
                <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 15px; margin-bottom: 20px;">
                    <p style="color: #f59e0b; margin: 0; font-size: 14px;">
                        <i class="fas fa-clock"></i> This payment request will expire in 15 minutes
                    </p>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="closeModal('paymentInstructionsModal')" class="btn-secondary" style="flex: 1;">
                        Close
                    </button>
                    <button onclick="checkPaymentStatus('${paymentData.reference}')" class="btn-primary" style="flex: 1;">
                        <i class="fas fa-sync-alt"></i> Check Status
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Show payment pending modal with polling
function showPaymentPendingModal(paymentData) {
    const modal = document.createElement('div');
    modal.id = 'paymentPendingModal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: #1e293b; border-radius: 20px; padding: 40px; max-width: 400px; width: 90%; text-align: center;">
                <div class="spinner" style="width: 60px; height: 60px; margin: 0 auto 20px;"></div>
                
                <h2 style="margin: 0 0 10px 0;">Awaiting Payment</h2>
                <p style="color: #94a3b8; margin-bottom: 20px;">Please complete the payment on your device</p>
                
                <p id="paymentStatusText" style="color: #f59e0b; margin-bottom: 20px;">
                    <i class="fas fa-clock"></i> Checking payment status...
                </p>
                
                <button onclick="closeModal('paymentPendingModal')" class="btn-secondary" style="width: 100%;">
                    Cancel & Close
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Start polling for payment status
    if (paymentData.reference) {
        pollPaymentStatus(paymentData.reference);
    }
}

// Poll payment status from backend
async function pollPaymentStatus(reference, attempts = 0) {
    const maxAttempts = 30; // Poll for ~5 minutes (10 second intervals)
    
    if (attempts >= maxAttempts) {
        const statusText = document.getElementById('paymentStatusText');
        if (statusText) {
            statusText.innerHTML = '<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i> Payment timeout. Please check your transaction history.';
        }
        return;
    }
    
    try {
        const apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-backend.vercel.app';
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBase}/api/payments/status/${reference}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success && result.paid) {
            // Payment successful
            closeModal('paymentPendingModal');
            showPaymentSuccessModal(result);
            
            // Refresh wallet data
            if (window.ProductionDataLoader) {
                window.ProductionDataLoader.loadOverviewData();
                window.ProductionDataLoader.loadWalletPage(1);
            }
        } else if (result.failureReason || result.status === 'cancelled' || result.status === 'failed') {
            // Payment failed with specific reason
            const statusText = document.getElementById('paymentStatusText');
            if (statusText) {
                const errorIcon = result.failureReason === 'cancelled' ? 'fa-ban' : 
                                 result.failureReason === 'insufficient_funds' ? 'fa-wallet' :
                                 result.failureReason === 'no_wallet' ? 'fa-exclamation-triangle' :
                                 'fa-times-circle';
                
                const errorMessage = result.errorMessage || `Payment ${result.status}`;
                statusText.innerHTML = `<i class="fas ${errorIcon}" style="color: #ef4444;"></i> ${errorMessage}`;
            }
            
            // Stop polling for failed payments
            return;
        } else {
            // Still pending, poll again after 10 seconds
            setTimeout(() => pollPaymentStatus(reference, attempts + 1), 10000);
        }
    } catch (error) {
        console.error('Error polling payment status:', error);
        setTimeout(() => pollPaymentStatus(reference, attempts + 1), 10000);
    }
}

// Check payment status manually
async function checkPaymentStatus(reference) {
    if (!reference) {
        alert('❌ No payment reference found');
        return;
    }
    
    try {
        const apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-backend.vercel.app';
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBase}/api/payments/status/${reference}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success && result.paid) {
            closeModal('paymentInstructionsModal');
            showPaymentSuccessModal(result);
            
            // Refresh wallet data
            if (window.ProductionDataLoader) {
                window.ProductionDataLoader.loadOverviewData();
                window.ProductionDataLoader.loadWalletPage(1);
            }
        } else if (result.failureReason) {
            // Show specific error message
            const errorEmoji = result.failureReason === 'cancelled' ? '🚫' :
                              result.failureReason === 'insufficient_funds' ? '💰' :
                              result.failureReason === 'no_wallet' ? '⚠️' : '❌';
            alert(`${errorEmoji} ${result.errorMessage || 'Payment failed'}`);
        } else {
            alert(`Payment Status: ${result.status || 'Pending'}\n\n${result.message || 'Please complete the payment on your phone.'}`);
        }
    } catch (error) {
        console.error('Error checking payment status:', error);
        alert('❌ Failed to check payment status');
    }
}

// Show payment success modal
function showPaymentSuccessModal(paymentData) {
    const modal = document.createElement('div');
    modal.id = 'paymentSuccessModal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: #1e293b; border-radius: 20px; padding: 40px; max-width: 400px; width: 90%; text-align: center;">
                <div style="width: 80px; height: 80px; background: rgba(56, 231, 123, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: #38e77b;"></i>
                </div>
                
                <h2 style="margin: 0 0 10px 0; color: #38e77b;">Payment Successful!</h2>
                <p style="color: #94a3b8; margin-bottom: 20px;">Your wallet has been topped up</p>
                
                <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <p style="color: #94a3b8; margin: 0 0 5px 0; font-size: 14px;">Amount Added</p>
                    <p style="color: #38e77b; margin: 0; font-size: 32px; font-weight: 700;">$${paymentData.amount?.toFixed(2) || '0.00'}</p>
                </div>
                
                <button onclick="closeModal('paymentSuccessModal')" class="btn-primary" style="width: 100%;">
                    <i class="fas fa-check"></i> Done
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ============================================
// PAYMENT RETURN HANDLER
// Called when customer returns from Paynow
// ============================================

// Check for payment return on page load
function checkPaymentReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const reference = urlParams.get('ref');
    
    if (paymentStatus === 'complete' && reference) {
        // User returned from Paynow - check the payment status
        console.log('Payment return detected, reference:', reference);
        handlePaymentReturn(reference);
        
        // Clean up URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
}

// Handle payment return - verify with backend
async function handlePaymentReturn(reference) {
    try {
        const apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-backend.vercel.app';
        const token = localStorage.getItem('authToken');
        
        // Show checking modal
        showPaymentCheckingModal();
        
        // Check payment status with backend
        const response = await fetch(`${apiBase}/api/payments/paynow/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reference })
        });
        
        const result = await response.json();
        
        // Close checking modal
        closeModal('paymentCheckingModal');
        
        if (result.success && result.paid) {
            // Payment confirmed
            showPaymentSuccessModal(result);
            
            // Refresh wallet data
            if (window.ProductionDataLoader) {
                window.ProductionDataLoader.loadOverviewData();
                window.ProductionDataLoader.loadWalletPage(1);
            }
        } else if (result.status === 'Cancelled') {
            showPaymentCancelledModal();
        } else if (result.status === 'Failed') {
            showPaymentFailedModal(result.message || 'Payment failed');
        } else {
            // Still pending - might need more time
            showPaymentPendingReturnModal(reference);
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        closeModal('paymentCheckingModal');
        alert('❌ Could not verify payment status. Please check your transaction history.');
    }
}

// Show payment checking modal
function showPaymentCheckingModal() {
    const modal = document.createElement('div');
    modal.id = 'paymentCheckingModal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: #1e293b; border-radius: 20px; padding: 40px; max-width: 400px; width: 90%; text-align: center;">
                <div class="spinner" style="width: 60px; height: 60px; margin: 0 auto 20px;"></div>
                <h2 style="margin: 0 0 10px 0;">Verifying Payment</h2>
                <p style="color: #94a3b8; margin: 0;">Please wait while we confirm your payment...</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Show payment cancelled modal
function showPaymentCancelledModal() {
    const modal = document.createElement('div');
    modal.id = 'paymentCancelledModal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: #1e293b; border-radius: 20px; padding: 40px; max-width: 400px; width: 90%; text-align: center;">
                <div style="width: 80px; height: 80px; background: rgba(245, 158, 11, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fas fa-times-circle" style="font-size: 48px; color: #f59e0b;"></i>
                </div>
                <h2 style="margin: 0 0 10px 0; color: #f59e0b;">Payment Cancelled</h2>
                <p style="color: #94a3b8; margin-bottom: 20px;">Your payment was cancelled. No funds were deducted.</p>
                <button onclick="closeModal('paymentCancelledModal')" class="btn-primary" style="width: 100%;">
                    Close
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Show payment failed modal
function showPaymentFailedModal(message) {
    const modal = document.createElement('div');
    modal.id = 'paymentFailedModal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: #1e293b; border-radius: 20px; padding: 40px; max-width: 400px; width: 90%; text-align: center;">
                <div style="width: 80px; height: 80px; background: rgba(239, 68, 68, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #ef4444;"></i>
                </div>
                <h2 style="margin: 0 0 10px 0; color: #ef4444;">Payment Failed</h2>
                <p style="color: #94a3b8; margin-bottom: 20px;">${message}</p>
                <div style="display: flex; gap: 10px;">
                    <button onclick="closeModal('paymentFailedModal')" class="btn-secondary" style="flex: 1;">
                        Close
                    </button>
                    <button onclick="closeModal('paymentFailedModal'); showDepositModal();" class="btn-primary" style="flex: 1;">
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Show pending return modal (payment still processing)
function showPaymentPendingReturnModal(reference) {
    const modal = document.createElement('div');
    modal.id = 'paymentPendingReturnModal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: #1e293b; border-radius: 20px; padding: 40px; max-width: 400px; width: 90%; text-align: center;">
                <div style="width: 80px; height: 80px; background: rgba(59, 130, 246, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fas fa-clock" style="font-size: 48px; color: #3b82f6;"></i>
                </div>
                <h2 style="margin: 0 0 10px 0; color: #3b82f6;">Payment Processing</h2>
                <p style="color: #94a3b8; margin-bottom: 20px;">Your payment is still being processed. This may take a few moments.</p>
                <p style="color: #64748b; font-size: 12px; margin-bottom: 20px;">Reference: ${reference}</p>
                <div style="display: flex; gap: 10px;">
                    <button onclick="closeModal('paymentPendingReturnModal')" class="btn-secondary" style="flex: 1;">
                        Close
                    </button>
                    <button onclick="closeModal('paymentPendingReturnModal'); handlePaymentReturn('${reference}');" class="btn-primary" style="flex: 1;">
                        <i class="fas fa-sync-alt"></i> Check Again
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Initialize payment return check on page load
document.addEventListener('DOMContentLoaded', checkPaymentReturn);

// ============================================
// END PAYMENT RETURN HANDLER
// ============================================

// Show Withdraw Modal
function showWithdrawModal() {
    const modal = document.createElement('div');
    modal.id = 'withdrawModal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: #1e293b; border-radius: 20px; padding: 40px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <h2 style="margin: 0;">💸 Withdraw Funds</h2>
                    <button onclick="closeModal('withdrawModal')" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                
                <form id="withdrawForm" onsubmit="handleWithdraw(event)">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Amount (USD)</label>
                        <input type="number" id="withdrawAmount" min="20" max="5000" step="0.01" required
                            style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;"
                            placeholder="Enter amount">
                        <small style="color: #94a3b8; display: block; margin-top: 5px;">Min: $20, Max: $5,000</small>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Withdrawal Method</label>
                        <select id="withdrawMethod" required onchange="toggleWithdrawFields()"
                            style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;">
                            <option value="">Select withdrawal method</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="mobile_money">Mobile Money - EcoCash</option>
                        </select>
                    </div>
                    
                    <div id="bankFields" style="display: none;">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Bank Name</label>
                            <input type="text" id="bankName"
                                style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;"
                                placeholder="Enter bank name">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Account Number</label>
                            <input type="text" id="accountNumber"
                                style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;"
                                placeholder="Enter account number">
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Account Holder Name</label>
                            <input type="text" id="accountHolder"
                                style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;"
                                placeholder="Enter account holder name">
                        </div>
                    </div>
                    
                    <div id="mobileFields" style="display: none;">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Mobile Number</label>
                            <input type="tel" id="mobileNumber"
                                style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;"
                                placeholder="+263 XXX XXX XXX">
                        </div>
                    </div>
                    
                    <button type="submit" class="btn-primary" style="width: 100%; padding: 15px; font-size: 16px;">
                        <span id="withdrawBtnText">Withdraw Funds</span>
                        <span id="withdrawBtnSpinner" style="display: none;"><i class="fas fa-spinner fa-spin"></i></span>
                    </button>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Show Transfer Modal
function showTransferModal() {
    const modal = document.createElement('div');
    modal.id = 'transferModal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: #1e293b; border-radius: 20px; padding: 40px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <h2 style="margin: 0;">💸 Transfer Funds</h2>
                    <button onclick="closeModal('transferModal')" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                
                <form id="transferForm" onsubmit="handleTransfer(event)">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Recipient User ID</label>
                        <input type="text" id="recipientId" required
                            style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;"
                            placeholder="Enter recipient user ID">
                        <small style="color: #94a3b8; display: block; margin-top: 5px;">Ask the recipient for their User ID</small>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Amount (USD)</label>
                        <input type="number" id="transferAmount" min="5" max="5000" step="0.01" required
                            style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;"
                            placeholder="Enter amount">
                        <small style="color: #94a3b8; display: block; margin-top: 5px;">Min: $5, Max: $5,000</small>
                    </div>
                    
                    <div style="margin-bottom: 30px;">
                        <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Description (Optional)</label>
                        <textarea id="transferDescription" maxlength="200" rows="3"
                            style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px; resize: vertical;"
                            placeholder="What's this transfer for?"></textarea>
                    </div>
                    
                    <button type="submit" class="btn-primary" style="width: 100%; padding: 15px; font-size: 16px;">
                        <span id="transferBtnText">Transfer Funds</span>
                        <span id="transferBtnSpinner" style="display: none;"><i class="fas fa-spinner fa-spin"></i></span>
                    </button>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Toggle withdraw fields based on method
function toggleWithdrawFields() {
    const method = document.getElementById('withdrawMethod').value;
    const bankFields = document.getElementById('bankFields');
    const mobileFields = document.getElementById('mobileFields');
    
    if (method === 'bank_transfer') {
        bankFields.style.display = 'block';
        mobileFields.style.display = 'none';
        document.getElementById('bankName').required = true;
        document.getElementById('accountNumber').required = true;
        document.getElementById('accountHolder').required = true;
        document.getElementById('mobileNumber').required = false;
    } else if (method === 'mobile_money') {
        bankFields.style.display = 'none';
        mobileFields.style.display = 'block';
        document.getElementById('bankName').required = false;
        document.getElementById('accountNumber').required = false;
        document.getElementById('accountHolder').required = false;
        document.getElementById('mobileNumber').required = true;
    } else {
        bankFields.style.display = 'none';
        mobileFields.style.display = 'none';
    }
}

// Close Modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

// Handle Withdraw
async function handleWithdraw(event) {
    event.preventDefault();
    
    const amount = document.getElementById('withdrawAmount').value;
    const method = document.getElementById('withdrawMethod').value;
    
    let accountDetails = {};
    if (method === 'bank_transfer') {
        accountDetails = {
            bank_name: document.getElementById('bankName').value,
            account_number: document.getElementById('accountNumber').value,
            account_holder: document.getElementById('accountHolder').value
        };
    } else if (method === 'mobile_money') {
        accountDetails = {
            phone_number: document.getElementById('mobileNumber').value
        };
    }
    
    const btnText = document.getElementById('withdrawBtnText');
    const btnSpinner = document.getElementById('withdrawBtnSpinner');
    
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline';
    
    try {
        const response = await window.ZimCrowdAPI.withdrawFunds(parseFloat(amount), method, accountDetails);
        
        if (response.success) {
            alert(`✅ Withdrawal request submitted successfully!\n\nAmount: $${amount}\nMethod: ${method}\nStatus: ${response.data.status}\nEstimated completion: ${response.data.estimated_completion}\nFees: $${response.data.fees}`);
            closeModal('withdrawModal');
            // Reload wallet data
            if (window.ProductionDataLoader) {
                window.ProductionDataLoader.loadOverviewData();
                window.ProductionDataLoader.loadWalletPage(1);
            } else if (window.DashboardLoader) {
                window.DashboardLoader.loadDashboardOverview();
            }
        } else {
            alert('❌ Withdrawal failed: ' + response.message);
        }
    } catch (error) {
        console.error('Withdrawal error:', error);
        alert('❌ Failed to process withdrawal. Please try again.');
    } finally {
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
    }
}

// Handle Transfer
async function handleTransfer(event) {
    event.preventDefault();
    
    const recipientId = document.getElementById('recipientId').value;
    const amount = document.getElementById('transferAmount').value;
    const description = document.getElementById('transferDescription').value;
    
    const btnText = document.getElementById('transferBtnText');
    const btnSpinner = document.getElementById('transferBtnSpinner');
    
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline';
    
    try {
        const response = await window.ZimCrowdAPI.transferFunds(recipientId, parseFloat(amount), description);
        
        if (response.success) {
            alert(`✅ Transfer completed successfully!\n\nRecipient: ${response.data.recipient.name}\nAmount: $${amount}\n${description ? 'Description: ' + description : ''}`);
            closeModal('transferModal');
            // Reload wallet data
            if (window.ProductionDataLoader) {
                window.ProductionDataLoader.loadOverviewData();
                window.ProductionDataLoader.loadWalletPage(1);
            } else if (window.DashboardLoader) {
                window.DashboardLoader.loadDashboardOverview();
            }
        } else {
            alert('❌ Transfer failed: ' + response.message);
        }
    } catch (error) {
        console.error('Transfer error:', error);
        alert('❌ Failed to process transfer. Please try again.');
    } finally {
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
    }
}

// Load Wallet Transactions
async function loadWalletTransactions() {
    try {
        const response = await window.ZimCrowdAPI.getWalletTransactions(1, 20);
        
        if (response.success) {
            updateWalletTransactionsUI(response.data.transactions);
        }
    } catch (error) {
        console.error('Failed to load wallet transactions:', error);
    }
}

// Update Wallet Transactions UI
function updateWalletTransactionsUI(transactions) {
    const container = document.querySelector('#wallet-section .transaction-list');
    if (!container) return;
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 40px;">No transactions yet</p>';
        return;
    }
    
    container.innerHTML = transactions.map(tx => {
        const isCredit = tx.type === 'deposit';
        const icon = isCredit ? 'arrow-down' : 'arrow-up';
        const color = isCredit ? '#38e77b' : '#ef4444';
        
        return `
            <div class="loan-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 50px; height: 50px; background: rgba(${isCredit ? '56, 231, 123' : '239, 68, 68'}, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-${icon}" style="color: ${color};"></i>
                        </div>
                        <div>
                            <h4 style="margin-bottom: 5px;">${tx.description || tx.type}</h4>
                            <p style="color: #94a3b8; font-size: 14px;">${new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 20px; font-weight: 700; color: ${color};">${isCredit ? '+' : '-'}$${parseFloat(tx.amount).toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
