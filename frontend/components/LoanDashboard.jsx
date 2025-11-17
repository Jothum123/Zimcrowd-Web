import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { 
    DollarSign, 
    Calculator, 
    FileText, 
    TrendingUp, 
    Clock, 
    CheckCircle, 
    XCircle, 
    AlertTriangle,
    CreditCard,
    PieChart
} from 'lucide-react';
import LoanApplication from './LoanApplication';
import LoanCalculator from './LoanCalculator';

const LoanDashboard = ({ user }) => {
    const [loans, setLoans] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchLoanData();
    }, []);

    const fetchLoanData = async () => {
        try {
            const [loansResponse, statsResponse] = await Promise.all([
                fetch('/api/loans', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }),
                fetch('/api/loans/stats', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                })
            ]);

            const loansData = await loansResponse.json();
            const statsData = await statsResponse.json();

            if (loansData.success) setLoans(loansData.data);
            if (statsData.success) setStats(statsData.data);
        } catch (error) {
            console.error('Error fetching loan data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved':
            case 'active':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'pending':
            case 'under_review':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case 'rejected':
            case 'defaulted':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <AlertTriangle className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'pending':
            case 'under_review':
                return 'bg-yellow-100 text-yellow-800';
            case 'rejected':
            case 'defaulted':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
                <h1 className="text-3xl font-bold">Loan Dashboard</h1>
                <Badge variant="outline" className="text-sm">
                    DTNI-Powered Lending
                </Badge>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Borrowed</p>
                                    <p className="text-2xl font-bold">{formatCurrency(stats.totalBorrowed || 0)}</p>
                                </div>
                                <DollarSign className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Active Loans</p>
                                    <p className="text-2xl font-bold">{stats.activeLoans || 0}</p>
                                </div>
                                <FileText className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Monthly Payment</p>
                                    <p className="text-2xl font-bold">{formatCurrency(stats.monthlyPayment || 0)}</p>
                                </div>
                                <CreditCard className="h-8 w-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">DTNI Utilization</p>
                                    <p className="text-2xl font-bold">{stats.dtniUtilization || '0%'}</p>
                                </div>
                                <PieChart className="h-8 w-8 text-purple-500" />
                            </div>
                            {stats.dtniUtilization && (
                                <Progress 
                                    value={parseFloat(stats.dtniUtilization)} 
                                    className="mt-2" 
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="calculator">Calculator</TabsTrigger>
                    <TabsTrigger value="apply">Apply</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Active Loans */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Active Loans
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loans.filter(loan => ['active', 'approved'].includes(loan.status)).length === 0 ? (
                                    <div className="text-center py-8">
                                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">No active loans</p>
                                        <Button 
                                            className="mt-4" 
                                            onClick={() => setActiveTab('apply')}
                                        >
                                            Apply for Loan
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {loans.filter(loan => ['active', 'approved'].includes(loan.status)).map((loan) => (
                                            <div key={loan.id} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {getStatusIcon(loan.status)}
                                                        <span className="font-medium">{formatCurrency(loan.amount)}</span>
                                                    </div>
                                                    <Badge className={getStatusColor(loan.status)}>
                                                        {loan.status}
                                                    </Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                                    <div>Monthly: {formatCurrency(loan.monthly_installment)}</div>
                                                    <div>Term: {Math.round(loan.term_days / 30)} months</div>
                                                    <div>Rate: {loan.interest_rate}%</div>
                                                    <div>Applied: {formatDate(loan.applied_at)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Quick Calculator */}
                        <LoanCalculator user={user} compact={true} />
                    </div>

                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Recent Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loans.length === 0 ? (
                                <div className="text-center py-8">
                                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">No loan activity yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {loans.slice(0, 5).map((loan) => (
                                        <div key={loan.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                                            <div className="flex items-center gap-3">
                                                {getStatusIcon(loan.status)}
                                                <div>
                                                    <p className="font-medium">{formatCurrency(loan.amount)} loan</p>
                                                    <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge className={getStatusColor(loan.status)}>
                                                    {loan.status}
                                                </Badge>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {formatDate(loan.applied_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Calculator Tab */}
                <TabsContent value="calculator">
                    <LoanCalculator user={user} />
                </TabsContent>

                {/* Apply Tab */}
                <TabsContent value="apply">
                    <LoanApplication 
                        user={user} 
                        onSuccess={(loanData) => {
                            fetchLoanData();
                            setActiveTab('overview');
                        }} 
                    />
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Loan History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loans.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">No loan history</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {loans.map((loan) => (
                                        <div key={loan.id} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(loan.status)}
                                                    <span className="font-medium text-lg">{formatCurrency(loan.amount)}</span>
                                                </div>
                                                <Badge className={getStatusColor(loan.status)}>
                                                    {loan.status}
                                                </Badge>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Monthly Payment</p>
                                                    <p className="font-medium">{formatCurrency(loan.monthly_installment)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Term</p>
                                                    <p className="font-medium">{Math.round(loan.term_days / 30)} months</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Interest Rate</p>
                                                    <p className="font-medium">{loan.interest_rate}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Applied</p>
                                                    <p className="font-medium">{formatDate(loan.applied_at)}</p>
                                                </div>
                                            </div>
                                            
                                            {loan.purpose && (
                                                <div className="mt-4 pt-4 border-t">
                                                    <p className="text-sm text-muted-foreground">Purpose</p>
                                                    <p className="text-sm">{loan.purpose}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default LoanDashboard;
