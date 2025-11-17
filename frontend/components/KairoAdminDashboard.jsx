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
    Brain, 
    TrendingUp, 
    AlertTriangle, 
    Shield, 
    Users, 
    DollarSign,
    PieChart,
    BarChart3,
    Activity,
    Target,
    Zap,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    MessageCircle,
    Send,
    Bot
} from 'lucide-react';

const KairoAdminDashboard = ({ user }) => {
    const [aiInsights, setAiInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('30d');
    const [activeTab, setActiveTab] = useState('overview');
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        fetchAIInsights();
    }, [timeframe]);

    const fetchAIInsights = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/kairo/admin-insights?timeframe=${timeframe}`, {
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

    const sendMessage = async () => {
        if (!chatInput.trim()) return;
        
        const userMessage = { type: 'user', content: chatInput, timestamp: new Date().toISOString() };
        const currentInput = chatInput;
        setChatMessages(prev => [...prev, userMessage]);
        setChatInput('');
        setChatLoading(true);

        try {
            // Use enhanced Azure OpenAI Kairo AI for admin
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
                
                // Refresh admin insights if AI provided business analysis
                if (data.intent && ['risk_assessment', 'fraud_analysis', 'business_insights'].includes(data.intent)) {
                    setTimeout(() => fetchAIInsights(), 1000);
                }
            } else {
                // Fallback to local Kairo if Azure fails
                const fallbackResponse = await fetch('/api/kairo/admin-insights', {
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
                        content: fallbackData.response || "I can help you analyze platform metrics and user behavior.", 
                        timestamp: new Date().toISOString(),
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
                    <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                        <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Kairo AI Analytics</h1>
                        <p className="text-muted-foreground">Advanced business intelligence dashboard</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select 
                        value={timeframe} 
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="px-3 py-2 border rounded-lg"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                    </select>
                    <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-purple-50">
                        <Activity className="h-4 w-4 mr-1" />
                        Live AI
                    </Badge>
                </div>
            </div>

            {/* Key Metrics Overview */}
            {aiInsights && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">AI Accuracy</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {(aiInsights.aiPerformance?.performance?.accuracyTrend?.slice(-1)[0] * 100 || 87).toFixed(1)}%
                                    </p>
                                </div>
                                <Brain className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Risk Score</p>
                                    <p className="text-2xl font-bold text-orange-600">
                                        {aiInsights.riskAnalysis?.portfolioRisk?.concentrationRisk * 100 || 45}
                                    </p>
                                </div>
                                <Shield className="h-8 w-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Fraud Rate</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        {aiInsights.fraudAnalysis?.fraudMetrics?.fraudRate || '0.8%'}
                                    </p>
                                </div>
                                <AlertTriangle className="h-8 w-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Growth Rate</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {aiInsights.userMetrics?.growthRate || 15.2}%
                                    </p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
                    <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
                    <TabsTrigger value="predictions">Predictions</TabsTrigger>
                    <TabsTrigger value="recommendations">Actions</TabsTrigger>
                    <TabsTrigger value="chat">AI Assistant</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {aiInsights && (
                        <>
                            {/* User Analytics */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-blue-500" />
                                            User Segments
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {aiInsights.userMetrics?.userSegments?.map((segment, index) => (
                                                <div key={index} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div 
                                                            className="w-3 h-3 rounded-full" 
                                                            style={{ backgroundColor: segment.color }}
                                                        ></div>
                                                        <span className="font-medium">{segment.name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold">{segment.count}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {((segment.count / aiInsights.userMetrics.totalUsers) * 100).toFixed(1)}%
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <DollarSign className="h-5 w-5 text-green-500" />
                                            Loan Portfolio
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                                    <div className="text-2xl font-bold text-green-600">
                                                        {aiInsights.loanMetrics?.totalLoans || 0}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">Total Loans</div>
                                                </div>
                                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                                    <div className="text-2xl font-bold text-blue-600">
                                                        ${aiInsights.loanMetrics?.totalValue?.toLocaleString() || 0}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">Total Value</div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span>High Risk Loans</span>
                                                    <span className="font-medium text-red-600">
                                                        {aiInsights.loanMetrics?.insights?.highRiskLoans || 0}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Average Loan Size</span>
                                                    <span className="font-medium">
                                                        ${aiInsights.loanMetrics?.averageLoanSize || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* AI Performance Metrics */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Brain className="h-5 w-5 text-purple-500" />
                                        AI Model Performance
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        {Object.entries(aiInsights.aiPerformance?.models || {}).map(([key, model]) => (
                                            <div key={key} className="text-center p-4 border rounded-lg">
                                                <div className="font-semibold text-sm mb-2">{model.name}</div>
                                                <div className="text-2xl font-bold text-blue-600 mb-1">
                                                    {(model.accuracy * 100).toFixed(1)}%
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    v{model.version}
                                                </div>
                                                <Progress value={model.accuracy * 100} className="mt-2" />
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* Risk Analysis Tab */}
                <TabsContent value="risk" className="space-y-6">
                    {aiInsights?.riskAnalysis && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Portfolio Risk</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-sm">Total Exposure</span>
                                                <span className="font-medium">
                                                    ${aiInsights.riskAnalysis.portfolioRisk.totalExposure?.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm">Concentration Risk</span>
                                                <span className="font-medium text-orange-600">
                                                    {(aiInsights.riskAnalysis.portfolioRisk.concentrationRisk * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm">Liquidity Risk</span>
                                                <span className="font-medium">
                                                    {(aiInsights.riskAnalysis.portfolioRisk.liquidityRisk * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Risk Distribution</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm">Low Risk</span>
                                                <Badge className="bg-green-100 text-green-800">
                                                    {aiInsights.riskAnalysis.userRiskProfiles?.lowRisk || 0}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm">Medium Risk</span>
                                                <Badge className="bg-yellow-100 text-yellow-800">
                                                    {aiInsights.riskAnalysis.userRiskProfiles?.mediumRisk || 0}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm">High Risk</span>
                                                <Badge className="bg-red-100 text-red-800">
                                                    {aiInsights.riskAnalysis.userRiskProfiles?.highRisk || 0}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Risk Alerts</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {aiInsights.riskAnalysis.alerts?.length > 0 ? (
                                                aiInsights.riskAnalysis.alerts.map((alert, index) => (
                                                    <Alert key={index}>
                                                        <AlertTriangle className="h-4 w-4" />
                                                        <AlertDescription className="text-sm">
                                                            {alert.description}
                                                        </AlertDescription>
                                                    </Alert>
                                                ))
                                            ) : (
                                                <div className="text-center text-muted-foreground py-4">
                                                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                                    <p className="text-sm">No critical risk alerts</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </TabsContent>

                {/* Fraud Detection Tab */}
                <TabsContent value="fraud" className="space-y-6">
                    {aiInsights?.fraudAnalysis && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-red-500" />
                                        Fraud Metrics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-3 bg-red-50 rounded-lg">
                                            <div className="text-2xl font-bold text-red-600">
                                                {aiInsights.fraudAnalysis.fraudMetrics?.fraudRate || '0.8%'}
                                            </div>
                                            <div className="text-sm text-muted-foreground">Fraud Rate</div>
                                        </div>
                                        <div className="text-center p-3 bg-green-50 rounded-lg">
                                            <div className="text-2xl font-bold text-green-600">
                                                {(aiInsights.fraudAnalysis.fraudMetrics?.detectionAccuracy * 100 || 94).toFixed(1)}%
                                            </div>
                                            <div className="text-sm text-muted-foreground">Detection Accuracy</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Eye className="h-5 w-5 text-blue-500" />
                                        Recent Alerts
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {aiInsights.fraudAnalysis.alerts?.length > 0 ? (
                                            aiInsights.fraudAnalysis.alerts.slice(0, 3).map((alert, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                                        <span className="text-sm font-medium">Suspicious Activity</span>
                                                    </div>
                                                    <Badge variant="destructive" className="text-xs">
                                                        High Risk
                                                    </Badge>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-muted-foreground py-4">
                                                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                                <p className="text-sm">No fraud alerts</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                {/* Predictions Tab */}
                <TabsContent value="predictions" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-green-500" />
                                    Growth Predictions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">
                                            {aiInsights?.userMetrics?.growthPrediction?.prediction?.nextMonth || 150}
                                        </div>
                                        <div className="text-sm text-muted-foreground">New Users Next Month</div>
                                        <div className="text-xs text-green-600 mt-1">
                                            Confidence: {((aiInsights?.userMetrics?.growthPrediction?.prediction?.confidence || 0.78) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-blue-500" />
                                    Loan Defaults
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                                        <div className="text-2xl font-bold text-orange-600">
                                            {aiInsights?.loanMetrics?.defaultPredictions?.predictions?.length || 5}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Predicted Defaults</div>
                                        <div className="text-xs text-orange-600 mt-1">
                                            Next 30 days
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="h-5 w-5 text-purple-500" />
                                    Market Trends
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {aiInsights?.marketInsights?.trends?.growthRate || 15.2}%
                                        </div>
                                        <div className="text-sm text-muted-foreground">Market Growth Rate</div>
                                        <div className="text-xs text-purple-600 mt-1">
                                            Quarterly projection
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Recommendations Tab */}
                <TabsContent value="recommendations" className="space-y-6">
                    {aiInsights?.recommendations && (
                        <div className="space-y-4">
                            {aiInsights.recommendations.map((rec, index) => (
                                <Card key={index}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                <Zap className="h-5 w-5 text-yellow-500" />
                                                {rec.title}
                                            </CardTitle>
                                            <Badge 
                                                variant={rec.priority === 'high' ? 'destructive' : 
                                                        rec.priority === 'medium' ? 'default' : 'secondary'}
                                            >
                                                {rec.priority} priority
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground mb-4">{rec.description}</p>
                                        <div className="mb-4">
                                            <div className="text-sm font-medium text-green-600 mb-2">
                                                Expected Impact: {rec.impact}
                                            </div>
                                            <div className="space-y-1">
                                                {rec.actions?.map((action, actionIndex) => (
                                                    <div key={actionIndex} className="flex items-center gap-2 text-sm">
                                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                                        {action}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <Button size="sm" className="w-full">
                                            Implement Recommendation
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* AI Assistant Chat Tab */}
                <TabsContent value="chat" className="space-y-6">
                    <Card className="h-[600px] flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-blue-500" />
                                AI Assistant - Admin Analytics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                                {chatMessages.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        <Bot className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                                        <p>Hi! I'm your AI assistant for admin analytics.</p>
                                        <p className="text-sm">Ask me about user behavior, risk analysis, fraud detection, or platform metrics!</p>
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
                                                                            onClick={() => handleSuggestionClick(`Analyze ${topic}`)}
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
                                                <span className="text-sm">AI is analyzing...</span>
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
                                    placeholder="Ask about platform analytics, user behavior, risk analysis..."
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
            </Tabs>

            {/* Floating Chat Widget */}
            <KairoFloatingChat 
                user={user} 
                isAdmin={true}
                onInsightUpdate={fetchAIInsights}
            />
        </div>
    );
};

export default KairoAdminDashboard;
