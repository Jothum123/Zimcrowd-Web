// ADMIN DASHBOARD ENHANCEMENTS
// Add these functions and sections to admin-dashboard-real.html

// =====================================================
// 1. KYC REVIEW & APPROVAL FUNCTIONS
// =====================================================

let kycQueue = [];
let currentKYCUser = null;

async function loadKYCQueue() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/profile-setup/admin/kyc-queue`, {
            headers: {
                'x-admin-key': ADMIN_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            kycQueue = data.data || [];
            displayKYCQueue(kycQueue);
            updateKYCBadge(kycQueue.length);
        }
    } catch (error) {
        console.error('Error loading KYC queue:', error);
        document.getElementById('kycQueueContainer').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #718096;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 16px;"></i>
                <p>Failed to load KYC queue</p>
                <button onclick="loadKYCQueue()" class="btn-primary" style="margin-top: 16px;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

function displayKYCQueue(queue) {
    const container = document.getElementById('kycQueueContainer');
    
    if (!queue || queue.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #718096;">
                <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981; margin-bottom: 16px;"></i>
                <p>No pending KYC applications</p>
            </div>
        `;
        return;
    }

    const queueHTML = queue.map(user => `
        <div class="kyc-card" style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 18px;">
                            ${user.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 600;">${user.full_name || 'Unknown'}</h3>
                            <p style="margin: 0; color: #718096; font-size: 14px;">${user.email || ''}</p>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
                        <div>
                            <span style="color: #718096; font-size: 12px;">Phone:</span>
                            <p style="margin: 0; font-weight: 600;">${user.phone_number || 'N/A'}</p>
                        </div>
                        <div>
                            <span style="color: #718096; font-size: 12px;">Submitted:</span>
                            <p style="margin: 0; font-weight: 600;">${new Date(user.last_document_submitted).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <span style="color: #718096; font-size: 12px;">Documents:</span>
                            <p style="margin: 0; font-weight: 600;">${user.documents_count || 0} files</p>
                        </div>
                        <div>
                            <span style="color: #718096; font-size: 12px;">Completion:</span>
                            <p style="margin: 0; font-weight: 600;">${user.setup_completion_percentage || 0}%</p>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px;">
                        <button onclick="viewKYCDetails('${user.user_id}')" style="flex: 1; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-eye"></i> View Documents
                        </button>
                        <button onclick="approveKYC('${user.user_id}')" style="flex: 1; padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button onclick="rejectKYC('${user.user_id}')" style="flex: 1; padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = queueHTML;
}

async function viewKYCDetails(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/profile-setup/documents?user_id=${userId}`, {
            headers: {
                'x-admin-key': ADMIN_API_KEY
            }
        });

        const data = await response.json();
        if (data.success) {
            showKYCDocumentsModal(data.data, userId);
        }
    } catch (error) {
        console.error('Error loading KYC documents:', error);
        alert('Failed to load KYC documents');
    }
}

function showKYCDocumentsModal(documents, userId) {
    const modal = document.getElementById('kycDocumentsModal');
    const container = document.getElementById('kycDocumentsContainer');
    
    const docsHTML = documents.map(doc => `
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="margin: 0 0 8px 0;">${doc.document_type.replace('_', ' ').toUpperCase()}</h4>
                    <p style="margin: 0; color: #718096; font-size: 14px;">
                        Submitted: ${new Date(doc.submitted_at).toLocaleString()}
                    </p>
                    ${doc.document_number ? `<p style="margin: 4px 0 0 0; color: #718096; font-size: 14px;">ID: ${doc.document_number}</p>` : ''}
                </div>
                <button onclick="window.open('${doc.file_url}', '_blank')" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    <i class="fas fa-download"></i> View
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = docsHTML;
    modal.style.display = 'flex';
    currentKYCUser = userId;
}

async function approveKYC(userId) {
    if (!confirm('Are you sure you want to approve this KYC application?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile-setup/admin/review-kyc/${userId}`, {
            method: 'POST',
            headers: {
                'x-admin-key': ADMIN_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'approve',
                document_reviews: [] // Can add specific document reviews
            })
        });

        const data = await response.json();
        if (data.success) {
            alert('✅ KYC approved successfully! User account is now active.');
            loadKYCQueue(); // Refresh queue
        } else {
            alert('❌ Failed to approve KYC: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error approving KYC:', error);
        alert('❌ Failed to approve KYC');
    }
}

async function rejectKYC(userId) {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile-setup/admin/review-kyc/${userId}`, {
            method: 'POST',
            headers: {
                'x-admin-key': ADMIN_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'reject',
                rejection_reason: reason
            })
        });

        const data = await response.json();
        if (data.success) {
            alert('✅ KYC rejected. User has been notified.');
            loadKYCQueue(); // Refresh queue
        } else {
            alert('❌ Failed to reject KYC: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error rejecting KYC:', error);
        alert('❌ Failed to reject KYC');
    }
}

function updateKYCBadge(count) {
    const badge = document.getElementById('kycPendingCount');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

// =====================================================
// 2. ACCOUNT STATUS MANAGEMENT FUNCTIONS
// =====================================================

let accountsData = [];
let currentStatusFilter = 'all';

async function loadAccountStatistics() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/account-status/statistics`, {
            headers: {
                'x-admin-key': ADMIN_API_KEY
            }
        });

        const data = await response.json();
        if (data.success) {
            displayAccountStatistics(data.data);
        }
    } catch (error) {
        console.error('Error loading account statistics:', error);
    }
}

function displayAccountStatistics(stats) {
    document.getElementById('activeAccountsCount').textContent = stats.active || 0;
    document.getElementById('pendingAccountsCount').textContent = stats.pending_verification || 0;
    document.getElementById('arrearsAccountsCount').textContent = stats.arrears || 0;
    document.getElementById('suspendedAccountsCount').textContent = stats.suspended || 0;
    
    // Update badge
    const arrearsCount = stats.arrears || 0;
    document.getElementById('arrearsCount').textContent = arrearsCount;
}

async function loadAccountsByStatus(status = 'all') {
    currentStatusFilter = status;
    
    try {
        let url = `${API_BASE_URL}/api/admin-dashboard/users?page=1&limit=50`;
        if (status !== 'all') {
            url += `&status=${status}`;
        }

        const response = await fetch(url, {
            headers: {
                'x-admin-key': ADMIN_API_KEY
            }
        });

        const data = await response.json();
        if (data.success) {
            accountsData = data.data.users || [];
            displayAccountsList(accountsData);
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

function displayAccountsList(accounts) {
    const container = document.getElementById('accountsListContainer');
    
    if (!accounts || accounts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #718096;">
                <p>No accounts found</p>
            </div>
        `;
        return;
    }

    const accountsHTML = accounts.map(account => {
        const statusColor = {
            'active': '#10b981',
            'pending_verification': '#f59e0b',
            'arrears': '#ef4444',
            'suspended': '#6b7280'
        }[account.account_status] || '#718096';

        return `
            <div class="account-card" style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700;">
                                ${account.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <h4 style="margin: 0; font-weight: 600;">${account.full_name || 'Unknown'}</h4>
                                <p style="margin: 0; color: #718096; font-size: 14px;">${account.email || ''}</p>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 16px; margin-bottom: 12px;">
                            <div>
                                <span style="display: inline-block; padding: 4px 12px; background: ${statusColor}20; color: ${statusColor}; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                    ${account.account_status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                                </span>
                            </div>
                            ${account.account_flags && account.account_flags.length > 0 ? `
                                <div>
                                    <span style="display: inline-block; padding: 4px 12px; background: #ef444420; color: #ef4444; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                        <i class="fas fa-flag"></i> ${account.account_flags.length} Flags
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px;">
                        <button onclick="viewUserDetails('${account.id}')" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button onclick="changeAccountStatus('${account.id}')" style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            <i class="fas fa-edit"></i> Status
                        </button>
                        <button onclick="flagAccount('${account.id}')" style="padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            <i class="fas fa-flag"></i> Flag
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = accountsHTML;
}

async function changeAccountStatus(userId) {
    const newStatus = prompt('Enter new status (active, pending_verification, arrears, suspended):');
    if (!newStatus) return;

    const reason = prompt('Reason for status change:');
    if (!reason) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/account-status/update`, {
            method: 'POST',
            headers: {
                'x-admin-key': ADMIN_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                new_status: newStatus,
                reason: reason
            })
        });

        const data = await response.json();
        if (data.success) {
            alert('✅ Account status updated successfully');
            loadAccountsByStatus(currentStatusFilter);
        } else {
            alert('❌ Failed to update status: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating account status:', error);
        alert('❌ Failed to update account status');
    }
}

async function flagAccount(userId) {
    const flagType = prompt('Enter flag type (suspicious_activity, payment_default, fraud_risk, kyc_issue):');
    if (!flagType) return;

    const reason = prompt('Reason for flagging:');
    if (!reason) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/account-status/flag`, {
            method: 'POST',
            headers: {
                'x-admin-key': ADMIN_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                flag_type: flagType,
                reason: reason,
                severity: 'high'
            })
        });

        const data = await response.json();
        if (data.success) {
            alert('✅ Account flagged successfully');
            loadAccountsByStatus(currentStatusFilter);
        } else {
            alert('❌ Failed to flag account: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error flagging account:', error);
        alert('❌ Failed to flag account');
    }
}

// =====================================================
// 3. USER DETAIL VIEW FUNCTIONS
// =====================================================

let currentUserId = null;

async function viewUserDetails(userId) {
    currentUserId = userId;
    
    try {
        // Load user data from existing users endpoint
        const response = await fetch(`${API_BASE_URL}/api/admin-dashboard/users?search=${userId}`, {
            headers: {
                'x-admin-key': ADMIN_API_KEY
            }
        });

        const data = await response.json();
        if (data.success && data.data.users.length > 0) {
            const user = data.data.users[0];
            showUserDetailModal(user);
        }
    } catch (error) {
        console.error('Error loading user details:', error);
        alert('Failed to load user details');
    }
}

function showUserDetailModal(user) {
    const modal = document.getElementById('userDetailModal');
    
    // Update user info
    document.getElementById('userDetailName').textContent = user.full_name || 'Unknown';
    document.getElementById('userDetailEmail').textContent = user.email || '';
    document.getElementById('userDetailPhone').textContent = user.phone_number || 'N/A';
    document.getElementById('userDetailStatus').textContent = user.account_status?.replace('_', ' ').toUpperCase() || 'UNKNOWN';
    document.getElementById('userDetailJoined').textContent = new Date(user.created_at).toLocaleDateString();
    
    modal.style.display = 'flex';
    
    // Load user tabs data
    loadUserLoans(user.id);
    loadUserInvestments(user.id);
    loadUserTransactions(user.id);
}

async function loadUserLoans(userId) {
    // Implementation for loading user's loans
    document.getElementById('userLoansContent').innerHTML = '<p>Loading loans...</p>';
}

async function loadUserInvestments(userId) {
    // Implementation for loading user's investments
    document.getElementById('userInvestmentsContent').innerHTML = '<p>Loading investments...</p>';
}

async function loadUserTransactions(userId) {
    // Implementation for loading user's transactions
    document.getElementById('userTransactionsContent').innerHTML = '<p>Loading transactions...</p>';
}

function closeUserDetailModal() {
    document.getElementById('userDetailModal').style.display = 'none';
    currentUserId = null;
}

// =====================================================
// 4. MODAL CONTROL FUNCTIONS
// =====================================================

function closeKYCDocumentsModal() {
    document.getElementById('kycDocumentsModal').style.display = 'none';
    currentKYCUser = null;
}

// Close modals when clicking outside
window.onclick = function(event) {
    const kycModal = document.getElementById('kycDocumentsModal');
    const userModal = document.getElementById('userDetailModal');
    
    if (event.target == kycModal) {
        closeKYCDocumentsModal();
    }
    if (event.target == userModal) {
        closeUserDetailModal();
    }
}

// Export functions for use in HTML
window.loadKYCQueue = loadKYCQueue;
window.viewKYCDetails = viewKYCDetails;
window.approveKYC = approveKYC;
window.rejectKYC = rejectKYC;
window.loadAccountStatistics = loadAccountStatistics;
window.loadAccountsByStatus = loadAccountsByStatus;
window.changeAccountStatus = changeAccountStatus;
window.flagAccount = flagAccount;
window.viewUserDetails = viewUserDetails;
window.closeUserDetailModal = closeUserDetailModal;
window.closeKYCDocumentsModal = closeKYCDocumentsModal;
