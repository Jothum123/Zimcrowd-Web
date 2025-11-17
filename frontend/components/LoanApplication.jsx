import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Calculator, DollarSign, Calendar, Percent, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const LoanApplication = ({ user, onSuccess }) => {
    const [formData, setFormData] = useState({
        amount: '',
        termDays: '90',
        interestRate: '5',
        purpose: ''
    });
    
    const [validation, setValidation] = useState(null);
    const [maxLoanData, setMaxLoanData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('form'); // 'form', 'validation', 'submit'

    // Calculate max loan on component mount
    useEffect(() => {
        if (formData.termDays && formData.interestRate) {
            calculateMaxLoan();
        }
    }, [formData.termDays, formData.interestRate]);

    const calculateMaxLoan = async () => {
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
        }
    };

    const validateLoan = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/loans/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    amount: parseFloat(formData.amount),
                    termDays: parseInt(formData.termDays),
                    interestRate: parseFloat(formData.interestRate)
                })
            });

            const result = await response.json();
            setValidation(result);
            setStep('validation');
        } catch (error) {
            console.error('Validation error:', error);
        } finally {
            setLoading(false);
        }
    };

    const submitApplication = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/loans/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    amount: parseFloat(formData.amount),
                    termDays: parseInt(formData.termDays),
                    interestRate: parseFloat(formData.interestRate),
                    purpose: formData.purpose
                })
            });

            const result = await response.json();
            if (result.success) {
                onSuccess?.(result.data);
            } else {
                setValidation(result);
                setStep('validation');
            }
        } catch (error) {
            console.error('Application error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setValidation(null);
        setStep('form');
    };

    const getStatusIcon = (approved) => {
        if (approved) return <CheckCircle className="h-5 w-5 text-green-500" />;
        return <XCircle className="h-5 w-5 text-red-500" />;
    };

    const getStatusColor = (approved) => {
        return approved ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-6 w-6" />
                        Loan Application
                    </CardTitle>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Loan Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Amount */}
                        <div className="space-y-2">
                            <Label htmlFor="amount">Loan Amount ($)</Label>
                            <Input
                                id="amount"
                                type="number"
                                min="50"
                                max="100000"
                                value={formData.amount}
                                onChange={(e) => handleInputChange('amount', e.target.value)}
                                placeholder="Enter loan amount"
                            />
                            {maxLoanData && (
                                <p className="text-sm text-muted-foreground">
                                    Maximum: ${maxLoanData.loanCalculation?.finalMaxLoanAmount}
                                </p>
                            )}
                        </div>

                        {/* Term */}
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

                        {/* Interest Rate */}
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

                        {/* Purpose */}
                        <div className="space-y-2">
                            <Label htmlFor="purpose">Loan Purpose</Label>
                            <Textarea
                                id="purpose"
                                value={formData.purpose}
                                onChange={(e) => handleInputChange('purpose', e.target.value)}
                                placeholder="Describe how you plan to use this loan..."
                                rows={3}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4">
                            <Button 
                                onClick={validateLoan} 
                                disabled={!formData.amount || !formData.purpose || loading}
                                className="flex-1"
                            >
                                <Calculator className="h-4 w-4 mr-2" />
                                Validate Loan
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column - Results */}
                <div className="space-y-6">
                    {/* Max Loan Calculation */}
                    {maxLoanData && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Calculator className="h-5 w-5" />
                                    Maximum Loan Capacity
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* DTNI Analysis */}
                                <div>
                                    <h4 className="font-medium mb-2">DTNI Analysis</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>Net Salary:</div>
                                        <div className="font-medium">${maxLoanData.dtniAnalysis?.netSalary}</div>
                                        <div>Max Installment (40%):</div>
                                        <div className="font-medium">${maxLoanData.dtniAnalysis?.maxInstallmentCapacity}</div>
                                        <div>Available Capacity:</div>
                                        <div className="font-medium">${maxLoanData.dtniAnalysis?.availableCapacity}</div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Loan Calculation */}
                                <div>
                                    <h4 className="font-medium mb-2">Loan Limits</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>From DTNI:</div>
                                        <div className="font-medium">${maxLoanData.loanCalculation?.maxLoanFromDTNI}</div>
                                        <div>Employment Cap:</div>
                                        <div className="font-medium">${maxLoanData.loanCalculation?.employmentCap}</div>
                                        <div>Final Maximum:</div>
                                        <div className="font-bold text-green-600">${maxLoanData.loanCalculation?.finalMaxLoanAmount}</div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {maxLoanData.loanCalculation?.limitation}
                                    </p>
                                </div>

                                <Separator />

                                {/* Repayment Details */}
                                <div>
                                    <h4 className="font-medium mb-2">Repayment Details</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>Monthly Payment:</div>
                                        <div className="font-medium">${maxLoanData.repaymentDetails?.monthlyRepayment}</div>
                                        <div>Total Interest:</div>
                                        <div className="font-medium">${maxLoanData.repaymentDetails?.totalInterest}</div>
                                        <div>Total Repayment:</div>
                                        <div className="font-medium">${maxLoanData.repaymentDetails?.totalRepayment}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Validation Results */}
                    {validation && (
                        <Card className={getStatusColor(validation.approved)}>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    {getStatusIcon(validation.approved)}
                                    Validation Result
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        {validation.message}
                                    </AlertDescription>
                                </Alert>

                                {validation.approved && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>Monthly Payment:</div>
                                            <div className="font-medium">${validation.data?.monthlyInstallment}</div>
                                            <div>Total Amount:</div>
                                            <div className="font-medium">${validation.data?.totalAmount}</div>
                                        </div>

                                        <Button 
                                            onClick={submitApplication}
                                            disabled={loading}
                                            className="w-full"
                                        >
                                            <FileText className="h-4 w-4 mr-2" />
                                            Submit Application
                                        </Button>
                                    </div>
                                )}

                                {validation.data?.dtni && (
                                    <div className="mt-4">
                                        <h4 className="font-medium mb-2">DTNI Breakdown</h4>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>Installment Utilization:</div>
                                            <div>{validation.data.dtni.installmentUtilization}</div>
                                            <div>Remaining Capacity:</div>
                                            <div>${validation.data.dtni.remainingCapacity}</div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoanApplication;
