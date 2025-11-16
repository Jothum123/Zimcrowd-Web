import React, { useState, useEffect } from 'react';
import './LoanApplicationForm.css';

/**
 * Loan Application Form with DTNI Validation
 * Integrates with real API endpoints for loan processing
 */
const LoanApplicationForm = ({ authToken, onSuccess, onError }) => {
    const [formData, setFormData] = useState({
        amount: '',
        termDays: 90, // Default to cold start
        interestRate: 5,
        purpose: ''
    });
    
    const [validation, setValidation] = useState(null);
    const [maxLoanData, setMaxLoanData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Validate loan in real-time
    const validateLoan = async () => {
        if (!formData.amount || formData.amount < 50) return;
        
        setLoading(true);
        try {
            const response = await fetch('/api/loans/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    amount: parseFloat(formData.amount),
                    termDays: parseInt(formData.termDays),
                    interestRate: parseFloat(formData.interestRate)
                })
            });

            const result = await response.json();
            setValidation(result);
            
            if (!result.approved) {
                setErrors({ validation: result.message });
            } else {
                setErrors({});
            }
        } catch (error) {
            console.error('Validation error:', error);
            setErrors({ validation: 'Failed to validate loan' });
        } finally {
            setLoading(false);
        }
    };

    // Calculate maximum loan amount
    const calculateMaxLoan = async () => {
        try {
            const response = await fetch('/api/loans/calculate-max', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
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

    // Submit loan application
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validation?.approved) {
            setErrors({ submit: 'Please fix validation errors before submitting' });
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch('/api/loans/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
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
                onSuccess?.(result);
            } else {
                setErrors({ submit: result.message });
                onError?.(result);
            }
        } catch (error) {
            console.error('Loan application error:', error);
            setErrors({ submit: 'Failed to submit loan application' });
            onError?.(error);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle input changes
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: null }));
    };

    // Auto-validate when key fields change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.amount && formData.termDays && formData.interestRate) {
                validateLoan();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.amount, formData.termDays, formData.interestRate]);

    // Calculate max loan when tenure/interest changes
    useEffect(() => {
        if (formData.termDays && formData.interestRate) {
            calculateMaxLoan();
        }
    }, [formData.termDays, formData.interestRate]);

    return (
        <div className="loan-application-form">
            <div className="form-header">
                <h2>💰 Apply for Loan</h2>
                <p>Get instant approval with our DTNI validation system</p>
            </div>

            {/* Max Loan Info */}
            {maxLoanData && (
                <div className="max-loan-info">
                    <h3>📊 Your Borrowing Capacity</h3>
                    <div className="capacity-grid">
                        <div className="capacity-item">
                            <span className="label">Net Salary:</span>
                            <span className="value">${maxLoanData.netSalary}</span>
                        </div>
                        <div className="capacity-item">
                            <span className="label">Max Installment (40%):</span>
                            <span className="value">${maxLoanData.maxTotalInstallment}</span>
                        </div>
                        <div className="capacity-item">
                            <span className="label">Available Capacity:</span>
                            <span className="value">${maxLoanData.availableInstallment}</span>
                        </div>
                        <div className="capacity-item">
                            <span className="label">Max Loan Amount:</span>
                            <span className="value highlight">${maxLoanData.finalMaxAmount}</span>
                        </div>
                    </div>
                    <div className="utilization-bar">
                        <div className="utilization-label">
                            Installment Utilization: {maxLoanData.installmentUtilization}
                        </div>
                        <div className="progress-bar">
                            <div 
                                className="progress-fill"
                                style={{ 
                                    width: maxLoanData.installmentUtilization,
                                    backgroundColor: parseFloat(maxLoanData.installmentUtilization) > 80 ? '#ef4444' : '#10b981'
                                }}
                            ></div>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="loan-form">
                {/* Loan Amount */}
                <div className="form-group">
                    <label htmlFor="amount">Loan Amount ($)</label>
                    <input
                        type="number"
                        id="amount"
                        min="50"
                        max={maxLoanData?.finalMaxAmount || 100000}
                        step="1"
                        value={formData.amount}
                        onChange={(e) => handleChange('amount', e.target.value)}
                        placeholder="Enter amount"
                        className={errors.amount ? 'error' : ''}
                    />
                    {maxLoanData && (
                        <button
                            type="button"
                            className="max-button"
                            onClick={() => handleChange('amount', maxLoanData.finalMaxAmount)}
                        >
                            Max: ${maxLoanData.finalMaxAmount}
                        </button>
                    )}
                    {errors.amount && <span className="error-text">{errors.amount}</span>}
                </div>

                {/* Loan Term */}
                <div className="form-group">
                    <label htmlFor="termDays">Loan Term</label>
                    <select
                        id="termDays"
                        value={formData.termDays}
                        onChange={(e) => handleChange('termDays', e.target.value)}
                        className={errors.termDays ? 'error' : ''}
                    >
                        <option value={90}>3 months (90 days) - Cold Start</option>
                        <option value={180}>6 months (180 days)</option>
                        <option value={270}>9 months (270 days)</option>
                        <option value={360}>12 months (360 days)</option>
                        <option value={540}>18 months (540 days) - Government Only</option>
                        <option value={720}>24 months (720 days) - Government Only</option>
                    </select>
                    {errors.termDays && <span className="error-text">{errors.termDays}</span>}
                </div>

                {/* Interest Rate */}
                <div className="form-group">
                    <label htmlFor="interestRate">Interest Rate (%)</label>
                    <input
                        type="range"
                        id="interestRate"
                        min="0"
                        max="10"
                        step="0.5"
                        value={formData.interestRate}
                        onChange={(e) => handleChange('interestRate', e.target.value)}
                    />
                    <div className="range-value">{formData.interestRate}% annual</div>
                </div>

                {/* Purpose */}
                <div className="form-group">
                    <label htmlFor="purpose">Loan Purpose</label>
                    <textarea
                        id="purpose"
                        value={formData.purpose}
                        onChange={(e) => handleChange('purpose', e.target.value)}
                        placeholder="Describe what you'll use this loan for..."
                        rows="3"
                        minLength="5"
                        maxLength="500"
                        className={errors.purpose ? 'error' : ''}
                    />
                    <div className="char-count">{formData.purpose.length}/500</div>
                    {errors.purpose && <span className="error-text">{errors.purpose}</span>}
                </div>

                {/* Validation Results */}
                {validation && (
                    <div className={`validation-result ${validation.approved ? 'approved' : 'denied'}`}>
                        <div className="validation-header">
                            <span className="icon">
                                {validation.approved ? '✅' : '❌'}
                            </span>
                            <span className="status">
                                {validation.approved ? 'Pre-Approved' : 'Not Approved'}
                            </span>
                        </div>
                        <p className="validation-message">{validation.message}</p>
                        
                        {validation.data && (
                            <div className="loan-details">
                                <div className="detail-item">
                                    <span>Monthly Payment:</span>
                                    <span>${validation.data.monthlyInstallment}</span>
                                </div>
                                <div className="detail-item">
                                    <span>Total Amount:</span>
                                    <span>${validation.data.totalAmount}</span>
                                </div>
                                <div className="detail-item">
                                    <span>Term:</span>
                                    <span>{validation.data.termMonths} months</span>
                                </div>
                            </div>
                        )}

                        {validation.data?.dtni && (
                            <div className="dtni-info">
                                <h4>DTNI Analysis</h4>
                                <div className="dtni-grid">
                                    <div>Net Salary: ${validation.data.dtni.netSalary}</div>
                                    <div>Max Installment: ${validation.data.dtni.maxInstallment}</div>
                                    <div>Utilization: {validation.data.dtni.installmentUtilization}</div>
                                </div>
                            </div>
                        )}

                        {validation.suggestion && (
                            <div className="suggestion">
                                <strong>💡 Suggestion:</strong> {validation.suggestion}
                            </div>
                        )}
                    </div>
                )}

                {/* Error Messages */}
                {errors.validation && (
                    <div className="error-message">
                        {errors.validation}
                    </div>
                )}

                {errors.submit && (
                    <div className="error-message">
                        {errors.submit}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    className={`submit-button ${validation?.approved ? 'approved' : 'disabled'}`}
                    disabled={!validation?.approved || submitting || loading}
                >
                    {submitting ? (
                        <>
                            <span className="spinner"></span>
                            Submitting...
                        </>
                    ) : loading ? (
                        <>
                            <span className="spinner"></span>
                            Validating...
                        </>
                    ) : validation?.approved ? (
                        'Submit Loan Application'
                    ) : (
                        'Fix Issues to Continue'
                    )}
                </button>
            </form>

            {/* Help Text */}
            <div className="help-text">
                <h4>📋 How it works:</h4>
                <ol>
                    <li>Enter your desired loan amount and terms</li>
                    <li>System validates against your DTNI capacity</li>
                    <li>Get instant pre-approval or suggestions</li>
                    <li>Submit application for final processing</li>
                </ol>
            </div>
        </div>
    );
};

export default LoanApplicationForm;
