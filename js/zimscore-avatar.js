/**
 * ZimScore Avatar System - Vanilla JavaScript Integration
 * Updates sidebar and navigation avatars with star ratings after KYC completion
 */

class ZimScoreAvatar {
    constructor() {
        this.zimscore = 0;
        this.stars = '☆☆☆☆☆';
        this.category = { text: 'Not Rated', color: '#6b7280' };
        this.loading = false;
        this.user = null;
        this.updateInterval = null;
    }

    // Initialize the avatar system
    async init(user) {
        this.user = user;
        if (!user || !user.id) return;

        // Initial ZimScore calculation
        await this.calculateZimScore();

        // Set up real-time updates for KYC completion
        this.setupKYCMonitoring();
    }

    // Calculate star display based on ZimScore
    calculateStars(score) {
        if (score >= 80) return '★★★★★'; // Excellent
        if (score >= 70) return '★★★★☆'; // Good
        if (score >= 60) return '★★★☆☆'; // Fair
        if (score >= 50) return '★★☆☆☆'; // Average
        if (score >= 40) return '★☆☆☆☆'; // Below Average
        return '☆☆☆☆☆'; // Poor
    }

    // Get rating category and color
    getRatingCategory(score) {
        if (score >= 80) return { text: 'Excellent', color: '#10b981' };
        if (score >= 70) return { text: 'Good', color: '#3b82f6' };
        if (score >= 60) return { text: 'Fair', color: '#f59e0b' };
        if (score >= 50) return { text: 'Average', color: '#6b7280' };
        if (score >= 40) return { text: 'Below Average', color: '#ef4444' };
        return { text: 'Poor', color: '#991b1b' };
    }

    // Fetch ZimScore from backend
    async calculateZimScore() {
        if (!this.user || !this.user.id) return;

        try {
            this.loading = true;
            this.updateLoadingState();

            const response = await fetch('/api/zimscore/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify({ userId: this.user.id })
            });

            const data = await response.json();
            if (data.success && data.zimscore > 0) {
                this.zimscore = data.zimscore;
                this.stars = data.stars || this.calculateStars(data.zimscore);
                this.category = {
                    text: data.category || this.getRatingCategory(data.zimscore).text,
                    color: data.color || this.getRatingCategory(data.zimscore).color
                };
                
                // Update avatars with new rating
                this.updateAvatars();
                
                // Show success notification
                this.showZimScoreNotification('ZimScore calculated successfully!', 'success');
            } else if (data.kycStatus === 'pending') {
                this.showZimScoreNotification('Complete KYC verification to get your ZimScore', 'warning');
            }
        } catch (error) {
            console.error('Failed to fetch ZimScore:', error);
            this.showZimScoreNotification('Failed to calculate ZimScore', 'error');
        } finally {
            this.loading = false;
            this.updateLoadingState();
        }
    }

    // Update both sidebar and navigation avatars
    updateAvatars() {
        // Update sidebar avatar
        this.updateSidebarAvatar();
        
        // Update navigation avatar
        this.updateNavigationAvatar();
    }

    // Update sidebar avatar with ZimScore
    updateSidebarAvatar() {
        const starsElement = document.getElementById('sidebar-zimscore-stars');
        const valueElement = document.getElementById('sidebar-zimscore-value');
        const avatarElement = document.getElementById('sidebar-avatar');
        const verifiedBadge = document.getElementById('sidebar-verified-badge');

        if (starsElement) {
            starsElement.textContent = this.stars;
            starsElement.style.color = '#fbbf24';
        }

        if (valueElement) {
            valueElement.textContent = `${this.zimscore}/85`;
            valueElement.style.color = this.category.color;
            valueElement.style.background = `${this.category.color}20`;
        }

        if (avatarElement && this.zimscore > 0) {
            // Add star badge to avatar
            let starBadge = avatarElement.querySelector('.avatar-star-badge');
            if (!starBadge) {
                starBadge = document.createElement('div');
                starBadge.className = 'avatar-star-badge';
                starBadge.innerHTML = '★';
                starBadge.style.cssText = `
                    position: absolute;
                    bottom: -2px;
                    right: -2px;
                    background: linear-gradient(135deg, #1e293b, #0f172a);
                    border: 1.5px solid #fbbf24;
                    border-radius: 50%;
                    width: 18px;
                    height: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fbbf24;
                    font-size: 10px;
                    font-weight: bold;
                    z-index: 10;
                `;
                avatarElement.appendChild(starBadge);
            }
        }

        if (verifiedBadge && this.zimscore > 0) {
            verifiedBadge.style.display = 'inline-flex';
        }
    }

    // Update navigation avatar with ZimScore
    updateNavigationAvatar() {
        const navAvatar = document.getElementById('nav-avatar');
        const headerUserName = document.getElementById('header-user-name');
        const verificationBadge = document.getElementById('verification-badge');

        if (navAvatar && this.zimscore > 0) {
            // Add star badge to nav avatar
            let starBadge = navAvatar.querySelector('.nav-star-badge');
            if (!starBadge) {
                starBadge = document.createElement('div');
                starBadge.className = 'nav-star-badge';
                starBadge.innerHTML = '★';
                starBadge.style.cssText = `
                    position: absolute;
                    bottom: -2px;
                    right: -2px;
                    background: #1e293b;
                    border: 1.5px solid #fbbf24;
                    border-radius: 50%;
                    width: 16px;
                    height: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fbbf24;
                    font-size: 9px;
                    font-weight: bold;
                `;
                navAvatar.style.position = 'relative';
                navAvatar.appendChild(starBadge);
            }
        }

        if (verificationBadge && this.zimscore > 0) {
            verificationBadge.innerHTML = `
                <span style="color: ${this.category.color}; display: inline-flex; align-items: center; gap: 4px;">
                    ★ ${this.stars} ${this.category.text}
                </span>
            `;
            verificationBadge.style.display = 'inline-flex';
        }
    }

    // Update loading state
    updateLoadingState() {
        const starsElement = document.getElementById('sidebar-zimscore-stars');
        const valueElement = document.getElementById('sidebar-zimscore-value');

        if (starsElement) {
            starsElement.textContent = this.loading ? '☆☆☆☆☆' : this.stars;
        }

        if (valueElement) {
            valueElement.textContent = this.loading ? '--/85' : `${this.zimscore}/85`;
        }
    }

    // Monitor KYC completion status
    setupKYCMonitoring() {
        // Check KYC status every 30 seconds until completed
        this.updateInterval = setInterval(async () => {
            if (this.zimscore > 0) {
                clearInterval(this.updateInterval);
                return;
            }

            await this.calculateZimScore();
        }, 30000);

        // Also check for document upload completion events
        this.listenForKYCEvents();
    }

    // Listen for KYC completion events
    listenForKYCEvents() {
        // Listen for custom events from document upload system
        document.addEventListener('kycCompleted', (event) => {
            console.log('KYC completion detected, calculating ZimScore...');
            setTimeout(() => this.calculateZimScore(), 1000);
        });

        // Listen for document verification events
        document.addEventListener('documentVerified', (event) => {
            console.log('Document verification detected, calculating ZimScore...');
            setTimeout(() => this.calculateZimScore(), 1000);
        });

        // Listen for salary verification events
        document.addEventListener('salaryVerified', (event) => {
            console.log('Salary verification detected, calculating ZimScore...');
            setTimeout(() => this.calculateZimScore(), 1000);
        });
    }

    // Show ZimScore notification
    showZimScoreNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    // Clean up resources
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Global instance
window.zimscoreAvatar = new ZimScoreAvatar();

// Auto-initialize when user data is available
document.addEventListener('DOMContentLoaded', () => {
    // Wait for user data to be loaded
    setTimeout(() => {
        if (window.currentUser) {
            window.zimscoreAvatar.init(window.currentUser);
        }
    }, 1000);
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZimScoreAvatar;
}
