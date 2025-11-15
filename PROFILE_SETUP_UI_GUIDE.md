# PROFILE SETUP UI INTEGRATION GUIDE

## RED COMPLETION CARD

Add this to dashboard.html after the account status banner:

```html
<!-- Profile Completion Card (Red Alert) -->
<div id="profileCompletionCard" style="display: none;">
    <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%); border: 2px solid #ef4444; border-radius: 12px; padding: 20px; margin-bottom: 20px; cursor: pointer;" onclick="openProfileSetupWizard()">
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                <div style="width: 50px; height: 50px; background: rgba(239, 68, 68, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; color: #ef4444;"></i>
                </div>
                <div style="flex: 1;">
                    <h3 style="color: #ef4444; margin: 0 0 5px 0; font-size: 18px; font-weight: 700;">
                        Complete Your Account Verification
                    </h3>
                    <p style="color: #94a3b8; margin: 0; font-size: 14px;">
                        Your account is incomplete. Complete your profile to access all features.
                    </p>
                    <div style="margin-top: 10px;">
                        <div style="background: rgba(15, 23, 42, 0.5); border-radius: 8px; height: 8px; overflow: hidden;">
                            <div id="setupProgressBar" style="background: linear-gradient(90deg, #ef4444 0%, #f97316 100%); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                        </div>
                        <p id="setupProgressText" style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">0% Complete</p>
                    </div>
                </div>
            </div>
            <button style="background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-arrow-right"></i> Complete Setup
            </button>
        </div>
    </div>
</div>
```

## SETUP WIZARD MODAL

Add modals for each step - see profile-setup-modals.html

## JAVASCRIPT INTEGRATION

Add to dashboard.html script section:

```javascript
// Profile Setup Manager
class ProfileSetupManager {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.setupData = {};
        this.init();
    }

    async init() {
        await this.checkSetupStatus();
        setInterval(() => this.checkSetupStatus(), 30000); // Check every 30s
    }

    async checkSetupStatus() {
        try {
            const response = await fetch('/api/profile-setup/status', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            
            if (data.success) {
                this.updateUI(data.data);
            }
        } catch (error) {
            console.error('Check setup status error:', error);
        }
    }

    updateUI(status) {
        const card = document.getElementById('profileCompletionCard');
        const progressBar = document.getElementById('setupProgressBar');
        const progressText = document.getElementById('setupProgressText');
        
        if (status.completion_percentage < 100) {
            // Show red card
            card.style.display = 'block';
            progressBar.style.width = status.completion_percentage + '%';
            progressText.textContent = status.completion_percentage + '% Complete - ' + status.pending_steps.length + ' steps remaining';
        } else {
            // Hide red card
            card.style.display = 'none';
        }
    }

    openWizard() {
        document.getElementById('profileSetupWizard').style.display = 'flex';
        this.showStep(1);
    }

    async saveProfile(formData) {
        const response = await fetch('/api/profile-setup/profile', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        return await response.json();
    }

    async saveEmployment(formData) {
        const response = await fetch('/api/profile-setup/employment', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        return await response.json();
    }

    async saveNextOfKin(formData) {
        const response = await fetch('/api/profile-setup/next-of-kin', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        return await response.json();
    }

    async savePaymentDetails(formData) {
        const response = await fetch('/api/profile-setup/payment-details', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        return await response.json();
    }

    async uploadDocument(formData) {
        const response = await fetch('/api/profile-setup/upload-document', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        return await response.json();
    }
}

// Initialize
let profileSetupManager;
document.addEventListener('DOMContentLoaded', () => {
    profileSetupManager = new ProfileSetupManager();
});

function openProfileSetupWizard() {
    profileSetupManager.openWizard();
}
```

## ADMIN KYC DASHBOARD

Add to admin dashboard:

```html
<div class="admin-section" id="kycReviewSection">
    <h2><i class="fas fa-id-card"></i> KYC Review Queue</h2>
    
    <div id="kycQueueList"></div>
</div>

<script>
async function loadKYCQueue() {
    const response = await fetch('/api/profile-setup/admin/kyc-queue', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    
    const list = document.getElementById('kycQueueList');
    list.innerHTML = data.data.map(user => `
        <div class="kyc-review-card">
            <h3>${user.full_name}</h3>
            <p>Email: ${user.email}</p>
            <p>Documents: ${user.documents_count}</p>
            <p>Submitted: ${new Date(user.last_document_submitted).toLocaleDateString()}</p>
            <button onclick="reviewKYC('${user.user_id}')">Review</button>
        </div>
    `).join('');
}

async function reviewKYC(userId) {
    // Open review modal
    // Show documents
    // Approve/Reject buttons
}
</script>
```

## STYLING

Add to dashboard CSS:

```css
.profile-setup-wizard {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.wizard-content {
    background: #1e293b;
    border-radius: 16px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 30px;
}

.wizard-step {
    display: none;
}

.wizard-step.active {
    display: block;
}

.step-indicator {
    display: flex;
    justify-content: space-between;
    margin-bottom: 30px;
}

.step-dot {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #334155;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    font-weight: 600;
}

.step-dot.completed {
    background: #10b981;
    color: white;
}

.step-dot.active {
    background: #3b82f6;
    color: white;
}
```

## COMPLETE INTEGRATION

1. Add red card HTML to dashboard
2. Add wizard modals (see separate file)
3. Add JavaScript manager
4. Add CSS styling
5. Test flow:
   - New user sees red card
   - Clicks card → Opens wizard
   - Completes 5 steps
   - Card disappears at 100%
   - Admin reviews and approves
   - Status changes to active
