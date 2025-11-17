/**
 * Kairo AI Floating Chat Widget
 * Enhanced with Azure OpenAI integration
 * Can be used in both user and admin dashboards
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
    MessageCircle, 
    Send, 
    Bot, 
    Brain, 
    Zap, 
    X, 
    Minimize2,
    Maximize2
} from 'lucide-react';

const KairoFloatingChat = ({ user, isAdmin = false, onInsightUpdate = null }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            loadChatHistory();
            setUnreadCount(0);
        }
    }, [isOpen]);

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const loadChatHistory = async () => {
        try {
            const response = await fetch('/api/kairo/chat-history', {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await response.json();
            if (data.success && data.conversations) {
                const messages = data.conversations.slice(-10).map(conv => [
                    { type: 'user', content: conv.user_message, timestamp: conv.created_at },
                    { type: 'ai', content: conv.ai_response, timestamp: conv.created_at }
                ]).flat();
                setChatMessages(messages);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    };

    const sendMessage = async () => {
        if (!chatInput.trim()) return;
        
        const userMessage = { type: 'user', content: chatInput, timestamp: new Date().toISOString() };
        const currentInput = chatInput;
        setChatMessages(prev => [...prev, userMessage]);
        setChatInput('');
        setChatLoading(true);

        try {
            // Use enhanced Azure OpenAI Kairo AI
            const response = await fetch('/api/kairo-azure/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ message: currentInput })
            });

            const data = await response.json();
            if (data.success) {
                const aiMessage = { 
                    type: 'ai', 
                    content: data.response, 
                    timestamp: new Date().toISOString(),
                    suggestions: data.suggestions || [],
                    quickActions: data.quickActions || [],
                    relatedTopics: data.relatedTopics || [],
                    confidence: data.confidence,
                    source: data.source,
                    model: data.model,
                    intent: data.intent
                };
                setChatMessages(prev => [...prev, aiMessage]);
                
                // Notify parent component if insights were provided
                if (onInsightUpdate && data.intent && 
                    ['investment_advice', 'loan_inquiry', 'financial_planning', 'risk_assessment'].includes(data.intent)) {
                    onInsightUpdate();
                }
                
                // Show notification if chat is closed
                if (!isOpen) {
                    setUnreadCount(prev => prev + 1);
                }
            } else {
                // Fallback to local Kairo if Azure fails
                const fallbackResponse = await fetch('/api/kairo/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.token}`
                    },
                    body: JSON.stringify({ message: currentInput })
                });
                
                const fallbackData = await fallbackResponse.json();
                if (fallbackData.success) {
                    const aiMessage = { 
                        type: 'ai', 
                        content: fallbackData.response, 
                        timestamp: new Date().toISOString(),
                        suggestions: fallbackData.suggestions || [],
                        source: 'local-fallback'
                    };
                    setChatMessages(prev => [...prev, aiMessage]);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = { 
                type: 'ai', 
                content: "I'm having trouble processing your request right now. Please try again in a moment.", 
                timestamp: new Date().toISOString(),
                isError: true
            };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setChatInput(suggestion);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const getWelcomeMessage = () => {
        if (isAdmin) {
            return {
                title: "AI Assistant - Admin Analytics",
                subtitle: "Ask me about user behavior, risk analysis, fraud detection, or platform metrics!"
            };
        }
        return {
            title: "Kairo AI Financial Assistant",
            subtitle: "Ask me anything about loans, investments, or your ZimScore!"
        };
    };

    const welcome = getWelcomeMessage();

    return (
        <>
            {/* Floating Chat Button */}
            {!isOpen && (
                <div className="fixed bottom-6 right-6 z-50">
                    <Button
                        onClick={() => setIsOpen(true)}
                        className="h-14 w-14 rounded-full shadow-lg bg-blue-500 hover:bg-blue-600 relative"
                        size="icon"
                    >
                        <MessageCircle className="h-6 w-6" />
                        {unreadCount > 0 && (
                            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-red-500">
                                {unreadCount}
                            </Badge>
                        )}
                    </Button>
                </div>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50">
                    <Card className={`w-96 shadow-2xl transition-all duration-300 ${
                        isMinimized ? 'h-16' : 'h-[500px]'
                    }`}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <Bot className="h-4 w-4 text-blue-500" />
                                    {welcome.title}
                                </CardTitle>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsMinimized(!isMinimized)}
                                        className="h-6 w-6 p-0"
                                    >
                                        {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsOpen(false)}
                                        className="h-6 w-6 p-0"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>

                        {!isMinimized && (
                            <CardContent className="flex flex-col h-[420px] p-4">
                                {/* Chat Messages */}
                                <div className="flex-1 overflow-y-auto space-y-3 mb-3 p-2 bg-gray-50 rounded-lg">
                                    {chatMessages.length === 0 ? (
                                        <div className="text-center text-muted-foreground py-4">
                                            <Bot className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                                            <p className="text-sm font-medium">Hi! I'm Kairo.</p>
                                            <p className="text-xs">{welcome.subtitle}</p>
                                        </div>
                                    ) : (
                                        <>
                                            {chatMessages.map((message, index) => (
                                                <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[280px] px-3 py-2 rounded-lg text-sm ${
                                                        message.type === 'user' 
                                                            ? 'bg-blue-500 text-white' 
                                                            : message.isError 
                                                                ? 'bg-red-50 border border-red-200 text-red-700'
                                                                : 'bg-white border shadow-sm'
                                                    }`}>
                                                        <p className="text-xs leading-relaxed">{message.content}</p>
                                                        
                                                        {/* AI Message Enhancements */}
                                                        {message.type === 'ai' && !message.isError && (
                                                            <div className="mt-2 space-y-2">
                                                                {/* AI Source & Confidence */}
                                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                    {message.source === 'azure-openai' && (
                                                                        <Badge variant="outline" className="text-xs bg-blue-50 h-4">
                                                                            <Brain className="h-2 w-2 mr-1" />
                                                                            Azure AI
                                                                        </Badge>
                                                                    )}
                                                                    {message.source === 'local-kairo' && (
                                                                        <Badge variant="outline" className="text-xs bg-green-50 h-4">
                                                                            <Zap className="h-2 w-2 mr-1" />
                                                                            Kairo AI
                                                                        </Badge>
                                                                    )}
                                                                    {message.confidence && (
                                                                        <span className="text-xs">
                                                                            {Math.round(message.confidence * 100)}%
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Quick Actions */}
                                                                {message.quickActions && message.quickActions.length > 0 && (
                                                                    <div className="space-y-1">
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {message.quickActions.slice(0, 2).map((action, idx) => (
                                                                                <Button
                                                                                    key={idx}
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="text-xs h-5 px-2"
                                                                                    onClick={() => handleSuggestionClick(action.text)}
                                                                                >
                                                                                    {action.text}
                                                                                </Button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Suggestions */}
                                                                {message.suggestions && message.suggestions.length > 0 && (
                                                                    <div className="space-y-1">
                                                                        {message.suggestions.slice(0, 2).map((suggestion, idx) => (
                                                                            <button
                                                                                key={idx}
                                                                                onClick={() => handleSuggestionClick(suggestion)}
                                                                                className="block w-full text-left text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border"
                                                                            >
                                                                                {suggestion}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Related Topics */}
                                                                {message.relatedTopics && message.relatedTopics.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {message.relatedTopics.slice(0, 3).map((topic, idx) => (
                                                                            <Badge 
                                                                                key={idx}
                                                                                variant="secondary" 
                                                                                className="text-xs cursor-pointer hover:bg-gray-200 h-4"
                                                                                onClick={() => handleSuggestionClick(`Tell me about ${topic}`)}
                                                                            >
                                                                                {topic}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <div ref={messagesEndRef} />
                                        </>
                                    )}
                                    
                                    {chatLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-white border px-3 py-2 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                                                    <span className="text-xs">Thinking...</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Chat Input */}
                                <div className="flex gap-2">
                                    <Input
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder={isAdmin ? "Ask about analytics..." : "Ask Kairo..."}
                                        onKeyPress={handleKeyPress}
                                        disabled={chatLoading}
                                        className="text-sm"
                                    />
                                    <Button 
                                        onClick={sendMessage} 
                                        disabled={!chatInput.trim() || chatLoading}
                                        size="sm"
                                        className="px-3"
                                    >
                                        <Send className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div>
            )}
        </>
    );
};

export default KairoFloatingChat;
