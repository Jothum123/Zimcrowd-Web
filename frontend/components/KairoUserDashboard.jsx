import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import KairoFloatingChat from './KairoFloatingChat';
import { 
    Bot, 
    Brain, 
    TrendingUp, 
    Target, 
    Lightbulb, 
    MessageCircle,
    Star,
    AlertCircle,
    CheckCircle,
    ArrowUp,
    ArrowDown,
    DollarSign,
    PieChart,
    BarChart3,
    Zap,
    Send
} from 'lucide-react';

const KairoUserDashboard = ({ user }) => {
    const [aiInsights, setAiInsights] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatLoading, setChatLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('insights');

    useEffect(() => {
        fetchAIInsights();
        loadChatHistory();
    }, []);

    const fetchAIInsights = async () => {
        try {
            const response = await fetch('/api/kairo/user-insights', {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await response.json();
            if (data.success) {
                setAiInsights(data.insights);
            }
        } catch (error) {
            console.error('Error fetching AI insights:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadChatHistory = async () => {
        try {
            const response = await fetch('/api/kairo/chat-history', {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await response.json();
            if (data.success) {
                setChatMessages(data.conversations.map(conv => [
                    { type: 'user', content: conv.user_message, timestamp: conv.created_at },
                    { type: 'ai', content: conv.ai_response, timestamp: conv.created_at }
                ]).flat());
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
                    model: data.model
                };
                setChatMessages(prev => [...prev, aiMessage]);
                
                // Refresh insights if AI provided financial advice
                if (data.intent && ['investment_advice', 'loan_inquiry', 'financial_planning'].includes(data.intent)) {
                    setTimeout(() => fetchAIInsights(), 1000);
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
            // Show error message to user
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                        <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Kairo AI Assistant</h1>
                        <p className="text-muted-foreground">Your personal financial advisor</p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-gradient-to-r from-purple-50 to-blue-50">
                    <Brain className="h-4 w-4 mr-1" />
                    AI-Powered
                </Badge>
            </div>

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="insights">AI Insights</TabsTrigger>
                    <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                    <TabsTrigger value="chat">Chat with Kairo</TabsTrigger>
                    <TabsTrigger value="predictions">Predictions</TabsTrigger>
                </TabsList>

                {/* AI Insights Tab */}
                <TabsContent value="insights" className="space-y-6">
                    {aiInsights && (
                        <>
                            {/* Financial Health Score */}
                            <Card className="bg-gradient-to-r from-green-50 to-blue-50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Target className="h-5 w-5 text-green-600" />
                                        Financial Health Score
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-4xl font-bold text-green-600">
                                            {aiInsights.healthScore || 75}/100
                                        </div>
                                        <Badge className="bg-green-100 text-green-800">
                                            {aiInsights.healthScore >= 80 ? 'Excellent' : 
                                             aiInsights.healthScore >= 60 ? 'Good' : 
                                             aiInsights.healthScore >= 40 ? 'Fair' : 'Needs Improvement'}
                                        </Badge>
                                    </div>
                                    <Progress value={aiInsights.healthScore || 75} className="mb-4" />
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div className="text-center">
                                            <div className="font-semibold text-blue-600">ZimScore</div>
                                            <div>{aiInsights.zimScore || 65}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-semibold text-purple-600">Debt Ratio</div>
                                            <div>{aiInsights.debtRatio || '25%'}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-semibold text-orange-600">Savings Rate</div>
                                            <div>{aiInsights.savingsRate || '15%'}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-semibold text-green-600">Investment</div>
                                            <div>{aiInsights.investmentScore || '12%'}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Key Insights Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Loan Insights */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <DollarSign className="h-5 w-5 text-blue-500" />
                                            Loan Insights
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Available Credit</span>
                                            <span className="font-semibold text-green-600">
                                                ${aiInsights.availableCredit || '5,000'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Interest Rate</span>
                                            <span className="font-semibold">
                                                {aiInsights.interestRate || '12.5%'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">DTNI Utilization</span>
                                            <span className="font-semibold">
                                                {aiInsights.dtniUtilization || '35%'}
                                            </span>
                                        </div>
                                        <Alert>
                                            <Lightbulb className="h-4 w-4" />
                                            <AlertDescription className="text-xs">
                                                {aiInsights.loanTip || "You can increase your loan limit by improving your ZimScore"}
                                            </AlertDescription>
                                        </Alert>
                                    </CardContent>
                                </Card>

                                {/* Investment Insights */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <PieChart className="h-5 w-5 text-purple-500" />
                                            Investment Insights
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Portfolio Value</span>
                                            <span className="font-semibold text-purple-600">
                                                ${aiInsights.portfolioValue || '2,500'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Monthly Return</span>
                                            <span className="font-semibold text-green-600 flex items-center gap-1">
                                                <ArrowUp className="h-3 w-3" />
                                                {aiInsights.monthlyReturn || '8.5%'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Risk Level</span>
                                            <Badge variant="outline" className="text-xs">
                                                {aiInsights.riskLevel || 'Medium'}
                                            </Badge>
                                        </div>
                                        <Alert>
                                            <TrendingUp className="h-4 w-4" />
                                            <AlertDescription className="text-xs">
                                                {aiInsights.investmentTip || "Consider diversifying with fixed deposits for stability"}
                                            </AlertDescription>
                                        </Alert>
                                    </CardContent>
                                </Card>

                                {/* ZimScore Insights */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <BarChart3 className="h-5 w-5 text-orange-500" />
                                            ZimScore Insights
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Current Score</span>
                                            <span className="font-semibold text-orange-600">
                                                {aiInsights.zimScore || 65}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Monthly Change</span>
                                            <span className="font-semibold text-green-600 flex items-center gap-1">
                                                <ArrowUp className="h-3 w-3" />
                                                +{aiInsights.scoreChange || 3}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Next Milestone</span>
                                            <span className="font-semibold">
                                                {aiInsights.nextMilestone || 70}
                                            </span>
                                        </div>
                                        <Alert>
                                            <Star className="h-4 w-4" />
                                            <AlertDescription className="text-xs">
                                                {aiInsights.scoreTip || "Pay your next loan early to boost your score by 5 points"}
                                            </AlertDescription>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* AI Predictions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Brain className="h-5 w-5 text-blue-500" />
                                        AI Predictions & Trends
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                                            <div className="text-2xl font-bold text-blue-600 mb-2">
                                                {aiInsights.predictions?.zimScoreIn3Months || 72}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Predicted ZimScore (3 months)
                                            </div>
                                        </div>
                                        <div className="text-center p-4 bg-green-50 rounded-lg">
                                            <div className="text-2xl font-bold text-green-600 mb-2">
                                                ${aiInsights.predictions?.maxLoanIn6Months || '8,500'}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Max Loan Capacity (6 months)
                                            </div>
                                        </div>
                                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                                            <div className="text-2xl font-bold text-purple-600 mb-2">
                                                {aiInsights.predictions?.investmentGrowth || '15.2%'}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Expected Portfolio Growth
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* Recommendations Tab */}
                <TabsContent value="recommendations" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Priority Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-yellow-500" />
                                    Priority Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[
                                    {
                                        title: "Pay Next Loan Early",
                                        impact: "+5 ZimScore points",
                                        urgency: "high",
                                        description: "Pay your upcoming loan installment 3 days early to boost your score"
                                    },
                                    {
                                        title: "Increase Emergency Fund",
                                        impact: "Improved financial stability",
                                        urgency: "medium",
                                        description: "Add $500 to reach your 3-month emergency fund goal"
                                    },
                                    {
                                        title: "Diversify Investments",
                                        impact: "Reduced risk, stable returns",
                                        urgency: "low",
                                        description: "Consider adding fixed deposits to balance your portfolio"
                                    }
                                ].map((action, index) => (
                                    <div key={index} className="border rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-semibold">{action.title}</h4>
                                            <Badge 
                                                variant={action.urgency === 'high' ? 'destructive' : 
                                                        action.urgency === 'medium' ? 'default' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {action.urgency}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {action.description}
                                        </p>
                                        <div className="text-xs font-medium text-green-600">
                                            Impact: {action.impact}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Personalized Tips */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lightbulb className="h-5 w-5 text-blue-500" />
                                    Personalized Tips
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[
                                    {
                                        category: "Loan Optimization",
                                        tip: "Your DTNI utilization is only 35%. You could safely take a larger loan if needed.",
                                        icon: <DollarSign className="h-4 w-4 text-green-500" />
                                    },
                                    {
                                        category: "Investment Strategy",
                                        tip: "Based on your risk profile, consider 60% fixed deposits and 40% equity funds.",
                                        icon: <PieChart className="h-4 w-4 text-purple-500" />
                                    },
                                    {
                                        category: "Score Improvement",
                                        tip: "Maintaining your current payment pattern will get you to ZimScore 70 in 2 months.",
                                        icon: <TrendingUp className="h-4 w-4 text-orange-500" />
                                    }
                                ].map((tip, index) => (
                                    <div key={index} className="border rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            {tip.icon}
                                            <h4 className="font-semibold text-sm">{tip.category}</h4>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {tip.tip}
                                        </p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Chat Tab */}
                <TabsContent value="chat" className="space-y-6">
                    <Card className="h-[600px] flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-blue-500" />
                                Chat with Kairo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                                {chatMessages.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        <Bot className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                                        <p>Hi! I'm Kairo, your AI financial assistant.</p>
                                        <p className="text-sm">Ask me anything about loans, investments, or your ZimScore!</p>
                                    </div>
                                ) : (
                                    chatMessages.map((message, index) => (
                                        <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                                message.type === 'user' 
                                                    ? 'bg-blue-500 text-white' 
                                                    : message.isError 
                                                        ? 'bg-red-50 border border-red-200'
                                                        : 'bg-white border'
                                            }`}>
                                                <p className="text-sm">{message.content}</p>
                                                
                                                {/* AI Message Enhancements */}
                                                {message.type === 'ai' && !message.isError && (
                                                    <div className="mt-2 space-y-2">
                                                        {/* AI Source & Confidence */}
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            {message.source === 'azure-openai' && (
                                                                <Badge variant="outline" className="text-xs bg-blue-50">
                                                                    <Brain className="h-3 w-3 mr-1" />
                                                                    Azure AI
                                                                </Badge>
                                                            )}
                                                            {message.source === 'local-kairo' && (
                                                                <Badge variant="outline" className="text-xs bg-green-50">
                                                                    <Zap className="h-3 w-3 mr-1" />
                                                                    Kairo AI
                                                                </Badge>
                                                            )}
                                                            {message.confidence && (
                                                                <span className="text-xs">
                                                                    {Math.round(message.confidence * 100)}% confident
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Quick Actions */}
                                                        {message.quickActions && message.quickActions.length > 0 && (
                                                            <div className="space-y-1">
                                                                <p className="text-xs font-medium text-gray-600">Quick Actions:</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {message.quickActions.map((action, idx) => (
                                                                        <Button
                                                                            key={idx}
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="text-xs h-6 px-2"
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
                                                                <p className="text-xs font-medium text-gray-600">Suggestions:</p>
                                                                {message.suggestions.map((suggestion, idx) => (
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
                                                            <div className="space-y-1">
                                                                <p className="text-xs font-medium text-gray-600">Related:</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {message.relatedTopics.map((topic, idx) => (
                                                                        <Badge 
                                                                            key={idx}
                                                                            variant="secondary" 
                                                                            className="text-xs cursor-pointer hover:bg-gray-200"
                                                                            onClick={() => handleSuggestionClick(`Tell me about ${topic}`)}
                                                                        >
                                                                            {topic}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                {chatLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white border px-4 py-2 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                                <span className="text-sm">Kairo is thinking...</span>
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
                                    placeholder="Ask Kairo anything about your finances..."
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    disabled={chatLoading}
                                />
                                <Button 
                                    onClick={sendMessage} 
                                    disabled={!chatInput.trim() || chatLoading}
                                    size="icon"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Predictions Tab */}
                <TabsContent value="predictions" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Financial Trajectory */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-green-500" />
                                    Financial Trajectory
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">Next Month</span>
                                        <div className="text-right">
                                            <div className="font-semibold">ZimScore: 68</div>
                                            <div className="text-xs text-green-600">+3 points</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">3 Months</span>
                                        <div className="text-right">
                                            <div className="font-semibold">ZimScore: 72</div>
                                            <div className="text-xs text-green-600">+7 points</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">6 Months</span>
                                        <div className="text-right">
                                            <div className="font-semibold">ZimScore: 78</div>
                                            <div className="text-xs text-green-600">+13 points</div>
                                        </div>
                                    </div>
                                </div>
                                <Alert>
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription className="text-sm">
                                        At ZimScore 78, you'll qualify for our premium loan rates (8.5-10%)
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>

                        {/* Goal Predictions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-blue-500" />
                                    Goal Predictions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="border rounded-lg p-3">
                                        <div className="font-semibold text-sm mb-1">Emergency Fund Goal</div>
                                        <div className="flex justify-between items-center">
                                            <Progress value={75} className="flex-1 mr-3" />
                                            <span className="text-sm">75%</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Estimated completion: 2 months
                                        </div>
                                    </div>
                                    <div className="border rounded-lg p-3">
                                        <div className="font-semibold text-sm mb-1">Investment Portfolio</div>
                                        <div className="flex justify-between items-center">
                                            <Progress value={45} className="flex-1 mr-3" />
                                            <span className="text-sm">45%</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Estimated completion: 5 months
                                        </div>
                                    </div>
                                    <div className="border rounded-lg p-3">
                                        <div className="font-semibold text-sm mb-1">ZimScore 80+</div>
                                        <div className="flex justify-between items-center">
                                            <Progress value={65} className="flex-1 mr-3" />
                                            <span className="text-sm">65%</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Estimated completion: 8 months
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Floating Chat Widget */}
            <KairoFloatingChat 
                user={user} 
                isAdmin={false}
                onInsightUpdate={fetchAIInsights}
            />
        </div>
    );
};

export default KairoUserDashboard;
