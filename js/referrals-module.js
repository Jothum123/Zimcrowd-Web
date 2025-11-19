/**
 * Referrals Module
 * Referral code, sharing, and referral list
 */

const ReferralsModule = {
    referralData: null,
    referralCode: null,
    
    async loadReferrals() {
        const container = document.getElementById('referralsContent');
        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading referral data...</p></div>';
        
        try {
            this.referralData = await window.DashboardData.fetchReferrals();
            this.referralCode = await window.DashboardData.fetchReferralCode();
            this.renderReferrals();
        } catch (error) {
            console.error('Error loading referrals:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--danger);">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Failed to load referral data</p>
                    <button class="btn btn-primary" onclick="ReferralsModule.loadReferrals()">Retry</button>
                </div>
            `;
        }
    },
    
    renderReferrals() {
        const container = document.getElementById('referralsContent');
        const referrals = this.referralData?.referrals || [];
        const code = this.referralCode?.code || 'LOADING...';
        const totalEarnings = this.referralData?.total_earnings || 0;
        const pendingRewards = this.referralData?.pending_rewards || 0;
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">Total Referrals</span>
                        <div class="stat-icon info">
                            <i class="fas fa-users"></i>
                        </div>
                    </div>
                    <div class="stat-value">${referrals.length}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">Total Earnings</span>
                        <div class="stat-icon success">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                    </div>
                    <div class="stat-value">${window.DashboardCore.formatCurrency(totalEarnings)}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">Pending Rewards</span>
                        <div class="stat-icon warning">
                            <i class="fas fa-clock"></i>
                        </div>
                    </div>
                    <div class="stat-value">${window.DashboardCore.formatCurrency(pendingRewards)}</div>
                </div>
            </div>
            
            <div class="card" style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1.5rem;">Your Referral Code</h3>
                
                <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; padding: 1.5rem; background: var(--light); border-radius: 12px;">
                    <div style="flex: 1;">
                        <input type="text" class="form-input" id="referralCodeInput" value="${code}" readonly style="font-size: 1.5rem; font-weight: 700; text-align: center; letter-spacing: 2px;">
                    </div>
                    <button class="btn btn-primary" onclick="ReferralsModule.copyCode()">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
                
                <div id="qrCode" style="text-align: center; margin-bottom: 1.5rem;"></div>
                
                <h4 style="margin-bottom: 1rem;">Share Your Code</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <button class="btn btn-outline" onclick="ReferralsModule.shareOnFacebook()" style="background: #1877f2; color: white; border-color: #1877f2;">
                        <i class="fab fa-facebook"></i> Facebook
                    </button>
                    <button class="btn btn-outline" onclick="ReferralsModule.shareOnWhatsApp()" style="background: #25d366; color: white; border-color: #25d366;">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                    <button class="btn btn-outline" onclick="ReferralsModule.shareOnTwitter()" style="background: #1da1f2; color: white; border-color: #1da1f2;">
                        <i class="fab fa-twitter"></i> Twitter
                    </button>
                    <button class="btn btn-outline" onclick="ReferralsModule.shareViaEmail()">
                        <i class="fas fa-envelope"></i> Email
                    </button>
                </div>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 1.5rem;">Your Referrals</h3>
                ${referrals.length === 0 ? `
                    <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-user-friends" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                        <p>No referrals yet. Start sharing your code!</p>
                    </div>
                ` : `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Joined Date</th>
                                <th>Status</th>
                                <th>Earnings</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${referrals.map(ref => `
                                <tr>
                                    <td>${ref.name || 'User'}</td>
                                    <td>${window.DashboardCore.formatDate(ref.joined_at)}</td>
                                    <td><span class="badge ${window.DashboardCore.getStatusBadgeClass(ref.status)}">${ref.status}</span></td>
                                    <td style="font-weight: 600; color: var(--success);">${window.DashboardCore.formatCurrency(ref.earnings || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        `;
        
        this.generateQRCode(code);
    },
    
    generateQRCode(code) {
        const container = document.getElementById('qrCode');
        container.innerHTML = '';
        
        const referralUrl = `${window.location.origin}/signup.html?ref=${code}`;
        
        new QRCode(container, {
            text: referralUrl,
            width: 200,
            height: 200,
            colorDark: '#191A23',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    },
    
    copyCode() {
        const input = document.getElementById('referralCodeInput');
        input.select();
        document.execCommand('copy');
        window.DashboardCore.showSuccess('Referral code copied to clipboard!');
    },
    
    shareOnFacebook() {
        const code = this.referralCode?.code;
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(`Join ZimCrowd using my referral code: ${code}`)}`;
        window.open(url, '_blank', 'width=600,height=400');
    },
    
    shareOnWhatsApp() {
        const code = this.referralCode?.code;
        const text = `Join ZimCrowd and get started with peer-to-peer lending! Use my referral code: ${code}\n${window.location.origin}/signup.html?ref=${code}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    },
    
    shareOnTwitter() {
        const code = this.referralCode?.code;
        const text = `Join me on ZimCrowd! Use my referral code: ${code}`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`;
        window.open(url, '_blank', 'width=600,height=400');
    },
    
    shareViaEmail() {
        const code = this.referralCode?.code;
        const subject = 'Join ZimCrowd with my referral code';
        const body = `Hi,\n\nI'm using ZimCrowd for peer-to-peer lending and I think you'd love it too!\n\nUse my referral code: ${code}\n\nSign up here: ${window.location.origin}/signup.html?ref=${code}\n\nBest regards`;
        
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
};

window.ReferralsModule = ReferralsModule;
console.log('✅ Referrals Module loaded');
