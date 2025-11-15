// Wallet Functions for Dashboard
// Add these functions to dashboard.html before the pagination system

// Show Deposit Modal
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
                        <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Amount (USD)</label>
                        <input type="number" id="depositAmount" min="10" max="10000" step="0.01" required
                            style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;"
                            placeholder="Enter amount">
                        <small style="color: #94a3b8; display: block; margin-top: 5px;">Min: $10, Max: $10,000</small>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Payment Method</label>
                        <select id="depositMethod" required
                            style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;">
                            <option value="">Select payment method</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="credit_card">Credit Card (2.9% fee)</option>
                            <option value="debit_card">Debit Card (1.5% fee)</option>
                            <option value="mobile_money">Mobile Money - EcoCash ($2 fee)</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 30px;">
                        <label style="display: block; margin-bottom: 8px; color: #94a3b8;">Reference (Optional)</label>
                        <input type="text" id="depositReference" maxlength="100"
                            style="width: 100%; padding: 12px; background: #0f172a; border: 2px solid #334155; border-radius: 12px; color: white; font-size: 16px;"
                            placeholder="Transaction reference">
                    </div>
                    
                    <button type="submit" class="btn-primary" style="width: 100%; padding: 15px; font-size: 16px;">
                        <span id="depositBtnText">Deposit Funds</span>
                        <span id="depositBtnSpinner" style="display: none;"><i class="fas fa-spinner fa-spin"></i></span>
                    </button>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

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

// Handle Deposit
async function handleDeposit(event) {
    event.preventDefault();
    
    const amount = document.getElementById('depositAmount').value;
    const method = document.getElementById('depositMethod').value;
    const reference = document.getElementById('depositReference').value;
    
    const btnText = document.getElementById('depositBtnText');
    const btnSpinner = document.getElementById('depositBtnSpinner');
    
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline';
    
    try {
        const response = await window.ZimCrowdAPI.depositFunds(parseFloat(amount), method, reference);
        
        if (response.success) {
            alert(`✅ Deposit request submitted successfully!\n\nAmount: $${amount}\nMethod: ${method}\nStatus: ${response.data.status}\nEstimated completion: ${response.data.estimated_completion}`);
            closeModal('depositModal');
            // Reload wallet data
            loadDashboardOverview();
            loadWalletTransactions();
        } else {
            alert('❌ Deposit failed: ' + response.message);
        }
    } catch (error) {
        console.error('Deposit error:', error);
        alert('❌ Failed to process deposit. Please try again.');
    } finally {
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
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
            loadDashboardOverview();
            loadWalletTransactions();
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
            loadDashboardOverview();
            loadWalletTransactions();
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
