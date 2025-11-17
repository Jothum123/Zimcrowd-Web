import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
    Bot, 
    Send, 
    Minimize2, 
    Maximize2, 
    X, 
    MessageCircle,
    Lightbulb,
    DollarSign,
    PieChart,
    TrendingUp,
    User
} from 'lucide-react';

const KairoChatbot = ({ user, isOpen, onToggle, position = 'bottom-right' }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const messagesEndRef = useRef(null);

    const quickActions = [
        { icon: <DollarSign className="h-4 w-4" />, text: "Check loan eligibility", message: "What loans am I eligible for?" },
        { icon: <PieChart className="h-4 w-4" />, text: "Investment advice", message: "Give me investment recommendations" },
        { icon: <TrendingUp className="h-4 w-4" />, text: "Improve ZimScore", message: "How can I improve my ZimScore?" },
        { icon: <Lightbulb className="h-4 w-4" />, text: "Financial tips", message: "Give me financial planning tips" }
    ];

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            // Add welcome message
            setMessages([{
                type: 'ai',
                content: `Hi ${user?.first_name || 'there'}! I'm Kairo, your AI financial assistant. I can help you with loans, investments, ZimScore improvement, and financial planning. What would you like to know?`,
                timestamp: new Date().toISOString(),
                suggestions: ["Check my loan options", "Investment recommendations", "Improve my ZimScore", "Financial planning tips"]
            }]);
        }
    }, [isOpen, user]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const sendMessage = async (messageText = inputValue) => {
        if (!messageText.trim()) return;

        const userMessage = {
            type: 'user',
            content: messageText,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/kairo/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ message: messageText })
            });

            const data = await response.json();
            
            if (data.success) {
                const aiMessage = {
                    type: 'ai',
                    content: data.response,
                    timestamp: data.timestamp,
                    suggestions: data.suggestions,
                    intent: data.intent
                };
                setMessages(prev => [...prev, aiMessage]);
            } else {
                const errorMessage = {
                    type: 'ai',
                    content: data.message || "Sorry, I encountered an error. Please try again.",
                    timestamp: new Date().toISOString(),
                    isError: true
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = {
                type: 'ai',
                content: "I'm having trouble connecting right now. Please try again in a moment.",
                timestamp: new Date().toISOString(),
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

    const handleSuggestionClick = (suggestion) => {
        sendMessage(suggestion);
    };

    const handleQuickAction = (action) => {
        sendMessage(action.message);
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPositionClasses = () => {
        switch (position) {
            case 'bottom-left':
                return 'bottom-4 left-4';
            case 'bottom-right':
                return 'bottom-4 right-4';
            case 'top-left':
                return 'top-4 left-4';
            case 'top-right':
                return 'top-4 right-4';
            default:
                return 'bottom-4 right-4';
        }
    };

    if (!isOpen) {
        return (
            <Button
                onClick={onToggle}
                className={`fixed ${getPositionClasses()} z-50 rounded-full w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg`}
            >
                <MessageCircle className="h-6 w-6 text-white" />
            </Button>
        );
    }

    return (
        <div className={`fixed ${getPositionClasses()} z-50 w-96 max-w-[calc(100vw-2rem)]`}>
            <Card className="shadow-2xl border-0 bg-white">
                {/* Header */}
                <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <Bot className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Kairo AI</CardTitle>
                                <p className="text-xs text-white/80">Financial Assistant</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="text-white hover:bg-white/20 p-1 h-8 w-8"
                            >
                                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onToggle}
                                className="text-white hover:bg-white/20 p-1 h-8 w-8"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                {/* Chat Content */}
                {!isMinimized && (
                    <CardContent className="p-0">
                        {/* Messages */}
                        <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {messages.map((message, index) => (
                                <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                                        {message.type === 'ai' && (
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                                    <Bot className="h-3 w-3 text-white" />
                                                </div>
                                                <span className="text-xs text-gray-500">Kairo</span>
                                            </div>
                                        )}
                                        {message.type === 'user' && (
                                            <div className="flex items-center gap-2 mb-1 justify-end">
                                                <span className="text-xs text-gray-500">You</span>
                                                <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                                                    <User className="h-3 w-3 text-white" />
                                                </div>
                                            </div>
                                        )}
                                        <div className={`rounded-lg px-3 py-2 ${
                                            message.type === 'user' 
                                                ? 'bg-blue-500 text-white' 
                                                : message.isError
                                                    ? 'bg-red-50 border border-red-200 text-red-800'
                                                    : 'bg-white border border-gray-200'
                                        }`}>
                                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                            <p className="text-xs mt-1 opacity-70">
                                                {formatTime(message.timestamp)}
                                            </p>
                                        </div>
                                        
                                        {/* Suggestions */}
                                        {message.suggestions && message.suggestions.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {message.suggestions.map((suggestion, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleSuggestionClick(suggestion)}
                                                        className="block w-full text-left text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200 transition-colors"
                                                    >
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            
                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                        <span className="text-xs text-gray-500">Kairo is typing...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Actions */}
                        {messages.length <= 1 && (
                            <div className="p-4 border-t bg-white">
                                <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {quickActions.map((action, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleQuickAction(action)}
                                            className="flex items-center gap-2 p-2 text-xs bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors"
                                        >
                                            {action.icon}
                                            <span className="truncate">{action.text}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-4 border-t bg-white">
                            <div className="flex gap-2">
                                <Input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ask Kairo anything..."
                                    disabled={isLoading}
                                    className="flex-1 text-sm"
                                />
                                <Button
                                    onClick={() => sendMessage()}
                                    disabled={!inputValue.trim() || isLoading}
                                    size="sm"
                                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
};

export default KairoChatbot;
