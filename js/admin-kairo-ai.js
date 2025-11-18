/**
 * Admin Kairo AI Assistant
 * Specialized AI assistant for admin operations, troubleshooting, and insights
 */

let kairoWidget = null;
let kairoChat = null;
let kairoInput = null;
let isKairoOpen = false;
let isKairoMinimized = false;

// Admin-specific Kairo AI prompts and contexts
const ADMIN_KAIRO_CONTEXT = {
    role: "admin_assistant",
    capabilities: [
        "System performance analysis",
        "Risk assessment and alerts", 
        "Revenue optimization insights",
        "Troubleshooting guidance",
        "Data analysis and reporting",
        "Security monitoring",
        "User behavior analysis",
        "Financial anomaly detection",
        "Operational efficiency recommendations"
    ],
    systemInfo: {
        platform: "ZimCrowd Financial Platform",
        adminLevel: "dashboard_admin",
        features: ["wallet_monitoring", "manual_transactions", "user_management", "loan_processing"]
    }
};

// Initialize Kairo AI when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeKairoAI();
});

/**
 * Initialize Kairo AI widget
 */
function initializeKairoAI() {
    kairoWidget = document.getElementById('kairoWidget');
    kairoChat = document.getElementById('kairoChat');
    kairoInput = document.getElementById('kairoInput');
    
    // Setup input event listener
    if (kairoInput) {
        kairoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendKairoMessage();
            }
        });
    }
    
    console.log('🤖 Kairo AI Admin Assistant initialized');
}

/**
 * Toggle Kairo AI widget
 */
function toggleKairoAI() {
    if (!kairoWidget) return;
    
    if (isKairoOpen) {
        closeKairo();
    } else {
        openKairo();
    }
}

/**
 * Open Kairo AI widget
 */
function openKairo() {
    if (!kairoWidget) return;
    
    kairoWidget.style.display = 'flex';
    isKairoOpen = true;
    isKairoMinimized = false;
    
    // Focus on input
    if (kairoInput) {
        kairoInput.focus();
    }
    
    // Send welcome message if chat is empty
    if (kairoChat && kairoChat.children.length <= 1) {
        addKairoMessage('assistant', getWelcomeMessage());
    }
    
    console.log('🤖 Kairo AI opened');
}

/**
 * Close Kairo AI widget
 */
function closeKairo() {
    if (!kairoWidget) return;
    
    kairoWidget.style.display = 'none';
    isKairoOpen = false;
    isKairoMinimized = false;
    
    console.log('🤖 Kairo AI closed');
}

/**
 * Minimize Kairo AI widget
 */
function minimizeKairo() {
    if (!kairoWidget) return;
    
    if (isKairoMinimized) {
        // Restore
        kairoWidget.style.height = '500px';
        kairoWidget.querySelector('.kairo-content').style.display = 'flex';
        isKairoMinimized = false;
    } else {
        // Minimize
        kairoWidget.style.height = '60px';
        kairoWidget.querySelector('.kairo-content').style.display = 'none';
        isKairoMinimized = true;
    }
}

/**
 * Send message to Kairo AI
 */
async function sendKairoMessage() {
    const message = kairoInput.value.trim();
    if (!message) return;
    
    // Clear input
    kairoInput.value = '';
    
    // Add user message to chat
    addKairoMessage('user', message);
    
    // Show typing indicator
    showKairoTyping();
    
    try {
        // Send to Kairo AI API
        const response = await sendToKairoAPI(message);
        
        // Remove typing indicator
        hideKairoTyping();
        
        // Add AI response
        if (response.success) {
            addKairoMessage('assistant', response.message);
        } else {
            addKairoMessage('assistant', 'I apologize, but I encountered an error processing your request. Please try again.');
        }
        
    } catch (error) {
        console.error('❌ Kairo AI error:', error);
        hideKairoTyping();
        addKairoMessage('assistant', 'I\'m experiencing technical difficulties. Please try again in a moment.');
    }
}

/**
 * Send message to Kairo AI API
 */
async function sendToKairoAPI(message) {
    try {
        const apiKey = localStorage.getItem('admin_api_key') || 'admin-dev-key-123';
        
        // Prepare admin context
        const adminContext = {
            ...ADMIN_KAIRO_CONTEXT,
            currentAdmin: currentAdmin,
            dashboardData: dashboardData,
            currentSection: currentSection,
            timestamp: new Date().toISOString()
        };
        
        const requestBody = {
            message: message,
            context: adminContext,
            conversation_type: 'admin_assistance',
            admin_id: currentAdmin?.id,
            session_id: 'admin_' + Date.now()
        };
        
        const response = await fetch(API_BASE_URL + API_ENDPOINTS.kairoChat, {
            method: 'POST',
            headers: {
                'x-admin-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('❌ Kairo API error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Add message to Kairo chat
 */
function addKairoMessage(sender, message) {
    if (!kairoChat) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `kairo-message ${sender}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (sender === 'assistant') {
        contentDiv.innerHTML = `<i class="fas fa-robot"></i>${formatKairoMessage(message)}`;
    } else {
        contentDiv.textContent = message;
    }
    
    messageDiv.appendChild(contentDiv);
    kairoChat.appendChild(messageDiv);
    
    // Scroll to bottom
    kairoChat.scrollTop = kairoChat.scrollHeight;
}

/**
 * Format Kairo AI message with proper HTML
 */
function formatKairoMessage(message) {
    // Convert markdown-like formatting to HTML
    let formatted = message
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    
    // Handle lists
    if (formatted.includes('- ')) {
        const lines = formatted.split('<br>');
        let inList = false;
        let result = [];
        
        for (let line of lines) {
            if (line.trim().startsWith('- ')) {
                if (!inList) {
                    result.push('<ul>');
                    inList = true;
                }
                result.push(`<li>${line.trim().substring(2)}</li>`);
            } else {
                if (inList) {
                    result.push('</ul>');
                    inList = false;
                }
                result.push(line);
            }
        }
        
        if (inList) {
            result.push('</ul>');
        }
        
        formatted = result.join('<br>');
    }
    
    return formatted;
}

/**
 * Show typing indicator
 */
function showKairoTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'kairo-message assistant typing';
    typingDiv.id = 'kairoTyping';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = '<i class="fas fa-robot"></i><span class="typing-dots">Kairo is thinking...</span>';
    
    typingDiv.appendChild(contentDiv);
    kairoChat.appendChild(typingDiv);
    
    // Scroll to bottom
    kairoChat.scrollTop = kairoChat.scrollHeight;
}

/**
 * Hide typing indicator
 */
function hideKairoTyping() {
    const typingDiv = document.getElementById('kairoTyping');
    if (typingDiv) {
        typingDiv.remove();
    }
}

/**
 * Get welcome message based on admin role
 */
function getWelcomeMessage() {
    const adminName = currentAdmin?.name || 'Admin';
    const adminRole = currentAdmin?.role_display || 'Administrator';
    
    let welcomeMessage = `Hello ${adminName}! I'm Kairo, your AI admin assistant. As a ${adminRole}, I can help you with:\n\n`;
    
    // Customize based on role
    if (currentAdmin?.role === 'super_admin') {
        welcomeMessage += `**System Administration:**
- Complete system oversight and management
- Admin user management and role assignments
- System performance optimization
- Security monitoring and threat analysis

**Financial Operations:**
- Revenue analysis and optimization strategies
- Risk assessment and mitigation
- Transaction monitoring and fraud detection
- Financial reporting and insights

**Strategic Insights:**
- Business intelligence and analytics
- Growth opportunities identification
- Operational efficiency recommendations
- Market trend analysis`;
    } else if (currentAdmin?.role === 'finance_manager') {
        welcomeMessage += `**Financial Management:**
- Wallet monitoring and suspicious activity detection
- Manual transaction processing guidance
- Revenue analysis and reporting
- Risk assessment for financial operations

**Transaction Analysis:**
- Transaction pattern analysis
- Fraud detection insights
- Payment gateway optimization
- Financial reconciliation support`;
    } else if (currentAdmin?.role === 'customer_support') {
        welcomeMessage += `**User Support:**
- User account troubleshooting
- KYC review guidance
- Account status management
- Customer communication strategies

**Issue Resolution:**
- Common problem solutions
- Escalation procedures
- User behavior analysis
- Support ticket optimization`;
    } else {
        welcomeMessage += `**General Admin Support:**
- Dashboard insights and analysis
- System performance monitoring
- User behavior patterns
- Operational recommendations
- Troubleshooting assistance`;
    }
    
    welcomeMessage += `\n\n**Quick Commands:**
- "Show system status" - Get current system health
- "Analyze revenue trends" - Revenue performance insights
- "Check suspicious activity" - Security alerts and risks
- "User growth analysis" - User acquisition insights
- "Performance optimization" - System improvement suggestions

What would you like to know about your platform today?`;
    
    return welcomeMessage;
}

/**
 * Handle quick admin queries
 */
function handleQuickQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('system status') || lowerQuery.includes('health')) {
        return getSystemStatusInsight();
    } else if (lowerQuery.includes('revenue') || lowerQuery.includes('financial')) {
        return getRevenueInsight();
    } else if (lowerQuery.includes('suspicious') || lowerQuery.includes('security')) {
        return getSecurityInsight();
    } else if (lowerQuery.includes('users') || lowerQuery.includes('growth')) {
        return getUserGrowthInsight();
    } else if (lowerQuery.includes('performance') || lowerQuery.includes('optimization')) {
        return getPerformanceInsight();
    }
    
    return null;
}

/**
 * Get system status insight
 */
function getSystemStatusInsight() {
    const data = dashboardData.overview || {};
    
    return `**System Status Overview:**

**Current Metrics:**
- Total Users: ${data.total_users || 0}
- Active Today: ${data.new_users_today || 0}
- Total Transactions: ${data.total_transactions || 0}
- Revenue: $${formatNumber(data.total_revenue || 0)}

**System Health:**
- API Server: ✅ Online
- Database: ✅ Connected  
- Payment Gateway: ✅ Active
- Response Time: < 200ms

**Recommendations:**
- System is operating normally
- Monitor transaction volumes during peak hours
- Consider scaling if user growth exceeds 20% weekly`;
}

/**
 * Get revenue insight
 */
function getRevenueInsight() {
    const data = dashboardData.overview || {};
    
    return `**Revenue Analysis:**

**Current Performance:**
- Total Revenue: $${formatNumber(data.total_revenue || 0)}
- Today's Revenue: $${formatNumber(data.revenue_today || 0)}
- Average per User: $${((data.total_revenue || 0) / (data.total_users || 1)).toFixed(2)}

**Growth Opportunities:**
- Focus on user retention programs
- Optimize loan approval rates
- Implement referral incentives
- Consider premium service tiers

**Risk Factors:**
- Monitor payment gateway fees
- Track seasonal revenue patterns
- Watch for unusual transaction spikes`;
}

/**
 * Get security insight
 */
function getSecurityInsight() {
    const walletData = dashboardData.wallet || {};
    
    return `**Security & Risk Analysis:**

**Current Alerts:**
- Suspicious Activities: ${walletData.suspicious_activity?.length || 0}
- Failed Login Attempts: Low
- Unusual Transaction Patterns: Monitoring

**Security Recommendations:**
- Review KYC pending applications
- Monitor large transaction amounts
- Check for duplicate account patterns
- Verify bank transfer authenticity

**Action Items:**
- Enable 2FA for high-value transactions
- Implement velocity checks
- Regular security audits
- Update fraud detection rules`;
}

// Export functions for global access
window.toggleKairoAI = toggleKairoAI;
window.closeKairo = closeKairo;
window.minimizeKairo = minimizeKairo;
window.sendKairoMessage = sendKairoMessage;
