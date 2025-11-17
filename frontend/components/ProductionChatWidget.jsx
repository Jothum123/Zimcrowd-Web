/**
 * Production-Ready Chat Widget
 * Advanced AI chat widget with multi-model support for ZimCrowd
 */

import React, { useState, useEffect, useRef } from 'react';
import './ProductionChatWidget.css';

const ProductionChatWidget = ({ 
    apiBaseUrl = 'http://localhost:3001',
    userId,
    userToken,
    position = 'bottom-right',
    theme = 'light'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState('connected');
    const [currentModel, setCurrentModel] = useState('');
    const [aiInsights, setAiInsights] = useState(null);
    
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Initialize chat with welcome message
    useEffect(() => {
        setMessages([{
            id: 'welcome',
            type: 'ai',
            content: "👋 Hello! I'm Kairo, your AI financial assistant. I'm powered by multiple advanced AI models including DeepSeek, GLM-4.5, Qwen2.5, and Llama 3.3. How can I help you with your financial goals today?",
            timestamp: new Date(),
            model: 'system',
            confidence: 1.0,
            suggestions: [
                "💰 Help me with a loan",
                "📈 Investment advice",
                "📊 Improve my ZimScore",
                "💡 Financial planning tips"
            ]
        }]);
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load AI insights when widget opens
    useEffect(() => {
        if (isOpen && userId && userToken && !aiInsights) {
            loadAIInsights();
        }
    }, [isOpen, userId, userToken]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadAIInsights = async () => {
        try {
            const response = await fetch(`${apiBaseUrl}/api/kairo-azure/insights`, {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setAiInsights(data.insights);
            }
        } catch (error) {
            console.error('Failed to load AI insights:', error);
        }
    };

    const sendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputMessage.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);
        setConnectionStatus('sending');

        try {
            // Try Azure OpenAI enhanced endpoint first
            const response = await fetch(`${apiBaseUrl}/api/kairo-azure/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: inputMessage.trim(),
                    useAzure: true
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                const aiMessage = {
                    id: Date.now() + 1,
                    type: 'ai',
                    content: data.response,
                    timestamp: new Date(),
                    model: data.model || data.aiProvider || 'Unknown',
                    confidence: data.confidence || 0.8,
                    suggestions: data.suggestions || [],
                    followUpQuestions: data.followUpQuestions || [],
                    source: data.source || 'hybrid-ai',
                    fallbackUsed: data.fallbackUsed || false
                };

                setMessages(prev => [...prev, aiMessage]);
                setCurrentModel(aiMessage.model);
                setConnectionStatus('connected');
                
                // Update unread count if widget is closed
                if (!isOpen) {
                    setUnreadCount(prev => prev + 1);
                }
            } else {
                throw new Error('API request failed');
            }
        } catch (error) {
            console.error('Chat error:', error);
            setConnectionStatus('error');
            
            // Add error message
            const errorMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
                timestamp: new Date(),
                model: 'error-handler',
                confidence: 0.0,
                isError: true
            };
            
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const toggleWidget = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setUnreadCount(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const toggleMinimize = () => {
        setIsMinimized(!isMinimized);
    };

    const useSuggestion = (suggestion) => {
        setInputMessage(suggestion);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'connected': return '#10B981';
            case 'sending': return '#F59E0B';
            case 'error': return '#EF4444';
            default: return '#6B7280';
        }
    };

    const getModelBadgeColor = (model) => {
        if (model.includes('deepseek')) return '#8B5CF6';
        if (model.includes('glm')) return '#06B6D4';
        if (model.includes('qwen')) return '#F59E0B';
        if (model.includes('llama')) return '#10B981';
        if (model.includes('gpt')) return '#3B82F6';
        if (model.includes('gemini')) return '#EF4444';
        return '#6B7280';
    };

    return (
        <div className={`chat-widget ${position} ${theme}`}>
            {/* Chat Button */}
            <button 
                className="chat-toggle-btn"
                onClick={toggleWidget}
                aria-label="Toggle chat"
            >
                {isOpen ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                ) : (
                    <>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        {unreadCount > 0 && (
                            <span className="unread-badge">{unreadCount}</span>
                        )}
                    </>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className={`chat-window ${isMinimized ? 'minimized' : ''}`}>
                    {/* Header */}
                    <div className="chat-header">
                        <div className="chat-title">
                            <div className="ai-status">
                                <div 
                                    className="status-indicator"
                                    style={{ backgroundColor: getStatusColor() }}
                                ></div>
                                <span>Kairo AI Assistant</span>
                            </div>
                            {currentModel && (
                                <div 
                                    className="model-badge"
                                    style={{ backgroundColor: getModelBadgeColor(currentModel) }}
                                >
                                    {currentModel.split('/').pop().split(':')[0]}
                                </div>
                            )}
                        </div>
                        <div className="chat-controls">
                            <button 
                                onClick={toggleMinimize}
                                className="control-btn"
                                aria-label={isMinimized ? "Maximize" : "Minimize"}
                            >
                                {isMinimized ? "□" : "−"}
                            </button>
                            <button 
                                onClick={toggleWidget}
                                className="control-btn"
                                aria-label="Close chat"
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Messages */}
                            <div className="chat-messages">
                                {messages.map((message) => (
                                    <div 
                                        key={message.id} 
                                        className={`message ${message.type} ${message.isError ? 'error' : ''}`}
                                    >
                                        <div className="message-content">
                                            {message.content}
                                        </div>
                                        
                                        {message.type === 'ai' && (
                                            <div className="message-meta">
                                                <div className="ai-info">
                                                    {message.model && (
                                                        <span 
                                                            className="model-tag"
                                                            style={{ backgroundColor: getModelBadgeColor(message.model) }}
                                                        >
                                                            {message.model.split('/').pop().split(':')[0]}
                                                        </span>
                                                    )}
                                                    {message.confidence && (
                                                        <span className="confidence">
                                                            {Math.round(message.confidence * 100)}% confident
                                                        </span>
                                                    )}
                                                    {message.fallbackUsed && (
                                                        <span className="fallback-indicator">
                                                            Fallback used
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="timestamp">
                                                    {message.timestamp.toLocaleTimeString()}
                                                </span>
                                            </div>
                                        )}

                                        {/* Suggestions */}
                                        {message.suggestions && message.suggestions.length > 0 && (
                                            <div className="suggestions">
                                                {message.suggestions.map((suggestion, index) => (
                                                    <button
                                                        key={index}
                                                        className="suggestion-btn"
                                                        onClick={() => useSuggestion(suggestion)}
                                                    >
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                
                                {isLoading && (
                                    <div className="message ai loading">
                                        <div className="typing-indicator">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                )}
                                
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="chat-input">
                                <div className="input-container">
                                    <textarea
                                        ref={inputRef}
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Ask me about loans, investments, ZimScore..."
                                        disabled={isLoading}
                                        rows="1"
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!inputMessage.trim() || isLoading}
                                        className="send-btn"
                                        aria-label="Send message"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <line x1="22" y1="2" x2="11" y2="13"></line>
                                            <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
                                        </svg>
                                    </button>
                                </div>
                                
                                <div className="input-footer">
                                    <span className="powered-by">
                                        Powered by {currentModel ? currentModel.split('/').pop().split(':')[0] : 'Multi-Model AI'}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductionChatWidget;
