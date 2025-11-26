/**
 * Kairo AI Widget
 * AI-powered financial assistant chat interface
 */

const KairoWidget = {
    isOpen: false,
    messages: [],
    
    init() {
        this.setupEventListeners();
        this.loadChatHistory();
    },
    
    setupEventListeners() {
        // Toggle button
        document.getElementById('kairoToggle').addEventListener('click', () => {
            this.toggle();
        });
        
        // Close button
        document.getElementById('kairoClose').addEventListener('click', () => {
            this.close();
        });
        
        // Send button
        document.getElementById('kairoSend').addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Enter key to send
        document.getElementById('kairoInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    },
    
    toggle() {
        this.isOpen = !this.isOpen;
        const widget = document.getElementById('kairoWidget');
        
        if (this.isOpen) {
            widget.classList.add('open');
        } else {
            widget.classList.remove('open');
        }
    },
    
    open() {
        this.isOpen = true;
        document.getElementById('kairoWidget').classList.add('open');
    },
    
    close() {
        this.isOpen = false;
        document.getElementById('kairoWidget').classList.remove('open');
    },
    
    async loadChatHistory() {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/api/kairo/chat-history?limit=10`,
                { headers: window.DashboardCore.API_CONFIG.HEADERS }
            );
            
            if (response.ok) {
                const result = await response.json();
                const conversations = result.conversations || [];
                
                // Display previous messages
                conversations.reverse().forEach(conv => {
                    if (conv.user_message) {
                        this.addMessage(conv.user_message, 'user', false);
                    }
                    if (conv.ai_response) {
                        this.addMessage(conv.ai_response, 'ai', false);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            // Don't show error to user for history loading
        }
    },
    
    async sendMessage() {
        const input = document.getElementById('kairoInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Clear input
        input.value = '';
        
        // Add user message
        this.addMessage(message, 'user');
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/api/kairo/chat`,
                {
                    method: 'POST',
                    headers: window.DashboardCore.API_CONFIG.HEADERS,
                    body: JSON.stringify({ message })
                }
            );
            
            this.removeTypingIndicator();
            
            if (response.ok) {
                const result = await response.json();
                
                // Add AI response
                this.addMessage(result.response, 'ai');
                
                // Show suggestions if any
                if (result.suggestions && result.suggestions.length > 0) {
                    this.showSuggestions(result.suggestions);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Kairo AI error:', response.status, errorData);
                this.addMessage('Sorry, I encountered an error. Please try again.', 'ai');
            }
        } catch (error) {
            this.removeTypingIndicator();
            console.error('Error sending message:', error);
            this.addMessage('Sorry, I\'m having trouble connecting. Please check your internet connection.', 'ai');
        }
    },
    
    addMessage(text, sender, scroll = true) {
        const messagesContainer = document.getElementById('kairoMessages');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `kairo-message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = `message-avatar ${sender}`;
        avatar.textContent = sender === 'ai' ? 'K' : window.DashboardCore.DashboardState.user?.fullName?.[0] || 'U';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = text;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        messagesContainer.appendChild(messageDiv);
        
        if (scroll) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        this.messages.push({ text, sender, timestamp: new Date() });
    },
    
    showTypingIndicator() {
        const messagesContainer = document.getElementById('kairoMessages');
        
        const indicator = document.createElement('div');
        indicator.className = 'kairo-message typing-indicator';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="message-avatar ai">K</div>
            <div class="message-content">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
        `;
        
        messagesContainer.appendChild(indicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    
    removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    },
    
    showSuggestions(suggestions) {
        const messagesContainer = document.getElementById('kairoMessages');
        
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'kairo-suggestions';
        suggestionsDiv.innerHTML = `
            <div class="suggestions-title">Suggested questions:</div>
            ${suggestions.map(s => `
                <button class="suggestion-btn" onclick="KairoWidget.askSuggestion('${s}')">
                    ${s}
                </button>
            `).join('')}
        `;
        
        messagesContainer.appendChild(suggestionsDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    
    askSuggestion(question) {
        document.getElementById('kairoInput').value = question;
        this.sendMessage();
    },
    
    // Get AI insights for dashboard
    async getInsights() {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/kairo/user-insights`,
                { headers: window.DashboardCore.API_CONFIG.HEADERS }
            );
            
            if (response.ok) {
                const result = await response.json();
                return result.insights;
            }
        } catch (error) {
            console.error('Error getting insights:', error);
        }
        return null;
    },
    
    // Get loan recommendations
    async getLoanRecommendations(amount, purpose) {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/kairo/loan-recommendation`,
                {
                    method: 'POST',
                    headers: window.DashboardCore.API_CONFIG.HEADERS,
                    body: JSON.stringify({ amount, purpose })
                }
            );
            
            if (response.ok) {
                const result = await response.json();
                return result.recommendations;
            }
        } catch (error) {
            console.error('Error getting loan recommendations:', error);
        }
        return null;
    },
    
    // Get investment advice
    async getInvestmentAdvice(amount, riskTolerance, timeHorizon) {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/kairo/investment-advice`,
                {
                    method: 'POST',
                    headers: window.DashboardCore.API_CONFIG.HEADERS,
                    body: JSON.stringify({ amount, riskTolerance, timeHorizon })
                }
            );
            
            if (response.ok) {
                const result = await response.json();
                return result.advice;
            }
        } catch (error) {
            console.error('Error getting investment advice:', error);
        }
        return null;
    }
};

// Add CSS for typing indicator
const style = document.createElement('style');
style.textContent = `
    .typing-indicator .message-content {
        display: flex;
        gap: 4px;
        padding: 12px 16px;
    }
    
    .typing-indicator .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--text-secondary);
        animation: typing 1.4s infinite;
    }
    
    .typing-indicator .dot:nth-child(2) {
        animation-delay: 0.2s;
    }
    
    .typing-indicator .dot:nth-child(3) {
        animation-delay: 0.4s;
    }
    
    @keyframes typing {
        0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.7;
        }
        30% {
            transform: translateY(-10px);
            opacity: 1;
        }
    }
    
    .kairo-suggestions {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .suggestions-title {
        font-size: 0.85rem;
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
    }
    
    .suggestion-btn {
        background: var(--light);
        border: 1px solid var(--border);
        padding: 0.75rem;
        border-radius: 8px;
        text-align: left;
        cursor: pointer;
        transition: all 0.3s;
        font-family: inherit;
    }
    
    .suggestion-btn:hover {
        background: var(--primary);
        color: var(--dark);
        border-color: var(--primary);
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => KairoWidget.init());
} else {
    KairoWidget.init();
}

// Export
window.KairoWidget = KairoWidget;

console.log('✅ Kairo AI Widget loaded');
