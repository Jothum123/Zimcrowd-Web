import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Calculator, TrendingUp, DollarSign, Calendar, Percent } from 'lucide-react';

const LoanCalculator = ({ user, compact = false }) => {
    const [formData, setFormData] = useState({
        termDays: '360',
        interestRate: '5'
    });
    
    const [maxLoanData, setMaxLoanData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user?.token) {
            calculateMaxLoan();
        }
    }, [formData.termDays, formData.interestRate, user?.token]);

    const calculateMaxLoan = async () => {
        if (!user?.token) return;
        
        setLoading(true);
        try {
            const response = await fetch('/api/loans/calculate-max', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    termDays: parseInt(formData.termDays),
                    interestRate: parseFloat(formData.interestRate)
                })
            });

            const result = await response.json();
            if (result.success) {
                setMaxLoanData(result.data);
            }
        } catch (error) {
            console.error('Max loan calculation error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (compact) {
        return (
            <Card className="w-full">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Loan Calculator
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs">Term</Label>
                            <Select value={formData.termDays} onValueChange={(value) => handleInputChange('termDays', value)}>
                                <SelectTrigger className="h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="90">3 months</SelectItem>
                                    <SelectItem value="180">6 months</SelectItem>
                                    <SelectItem value="360">12 months</SelectItem>
                                    <SelectItem value="720">24 months</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs">Rate (%)</Label>
                            <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                value={formData.interestRate}
                                onChange={(e) => handleInputChange('interestRate', e.target.value)}
                                className="h-8"
                            />
                        </div>
                    </div>

                    {maxLoanData && (
                        <div className="space-y-2">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    ${maxLoanData.loanCalculation?.finalMaxLoanAmount}
                                </div>
                                <div className="text-xs text-muted-foreground">Maximum Loan</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>Monthly Payment:</div>
                                <div className="font-medium">${maxLoanData.repaymentDetails?.monthlyRepayment}</div>
                                <div>Total Interest:</div>
                                <div className="font-medium">${maxLoanData.repaymentDetails?.totalInterest}</div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-6 w-6" />
                    Loan Calculator
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Calculate your maximum loan amount based on DTNI analysis
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Input Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="term">Loan Term</Label>
                        <Select value={formData.termDays} onValueChange={(value) => handleInputChange('termDays', value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="90">3 months (90 days)</SelectItem>
                                <SelectItem value="180">6 months (180 days)</SelectItem>
                                <SelectItem value="270">9 months (270 days)</SelectItem>
                                <SelectItem value="360">12 months (360 days)</SelectItem>
                                <SelectItem value="540">18 months (540 days)</SelectItem>
                                <SelectItem value="720">24 months (720 days)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="interest">Interest Rate (%)</Label>
                        <Input
                            id="interest"
                            type="number"
                            min="0"
                            max="10"
                            step="0.5"
                            value={formData.interestRate}
                            onChange={(e) => handleInputChange('interestRate', e.target.value)}
                        />
                    </div>
                </div>

                {loading && (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-sm text-muted-foreground mt-2">Calculating...</p>
                    </div>
                )}

                {maxLoanData && !loading && (
                    <div className="space-y-6">
                        {/* Main Result */}
                        <div className="text-center p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
                            <div className="text-4xl font-bold text-green-600 mb-2">
                                ${maxLoanData.loanCalculation?.finalMaxLoanAmount}
                            </div>
                            <div className="text-lg text-muted-foreground">Maximum Loan Amount</div>
                            <Badge variant="secondary" className="mt-2">
                                {maxLoanData.summary?.employmentType} employee
                            </Badge>
                        </div>

                        {/* DTNI Analysis */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                                    <div className="text-2xl font-bold">${maxLoanData.dtniAnalysis?.netSalary}</div>
                                    <div className="text-sm text-muted-foreground">Net Salary</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Percent className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                                    <div className="text-2xl font-bold">${maxLoanData.dtniAnalysis?.maxInstallmentCapacity}</div>
                                    <div className="text-sm text-muted-foreground">Max Installment (40%)</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4 text-center">
                                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                    <div className="text-2xl font-bold">${maxLoanData.dtniAnalysis?.availableCapacity}</div>
                                    <div className="text-sm text-muted-foreground">Available Capacity</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detailed Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Loan Limits */}
                            <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <Calculator className="h-4 w-4" />
                                    Loan Limits
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>From DTNI Capacity:</span>
                                        <span className="font-medium">${maxLoanData.loanCalculation?.maxLoanFromDTNI}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Employment Cap:</span>
                                        <span className="font-medium">${maxLoanData.loanCalculation?.employmentCap}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-semibold">
                                        <span>Final Maximum:</span>
                                        <span className="text-green-600">${maxLoanData.loanCalculation?.finalMaxLoanAmount}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {maxLoanData.loanCalculation?.limitation}
                                    </p>
                                </div>
                            </div>

                            {/* Repayment Details */}
                            <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Repayment Details
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Monthly Payment:</span>
                                        <span className="font-medium">${maxLoanData.repaymentDetails?.monthlyRepayment}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Term:</span>
                                        <span className="font-medium">{maxLoanData.repaymentDetails?.termMonths} months</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Interest Rate:</span>
                                        <span className="font-medium">{maxLoanData.repaymentDetails?.interestRate}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Total Interest:</span>
                                        <span className="font-medium">${maxLoanData.repaymentDetails?.totalInterest}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-semibold">
                                        <span>Total Repayment:</span>
                                        <span>${maxLoanData.repaymentDetails?.totalRepayment}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Formula */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">DTNI Formula</h4>
                            <p className="text-sm text-muted-foreground">
                                {maxLoanData.summary?.formula}
                            </p>
                            <p className="text-sm font-medium mt-1">
                                {maxLoanData.summary?.result}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default LoanCalculator;
