/**
 * Loan API Integration Utilities
 * Provides clean interface for all loan-related API calls
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

class LoanAPI {
    constructor(token) {
        this.token = token;
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: this.headers,
                ...options
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    // Calculate maximum loan amount user can afford
    async calculateMaxLoan(termDays, interestRate) {
        return this.request('/api/loans/calculate-max', {
            method: 'POST',
            body: JSON.stringify({
                termDays: parseInt(termDays),
                interestRate: parseFloat(interestRate)
            })
        });
    }

    // Validate loan application without submitting
    async validateLoan(amount, termDays, interestRate) {
        return this.request('/api/loans/validate', {
            method: 'POST',
            body: JSON.stringify({
                amount: parseFloat(amount),
                termDays: parseInt(termDays),
                interestRate: parseFloat(interestRate)
            })
        });
    }

    // Submit loan application
    async applyForLoan(amount, termDays, interestRate, purpose) {
        return this.request('/api/loans/apply', {
            method: 'POST',
            body: JSON.stringify({
                amount: parseFloat(amount),
                termDays: parseInt(termDays),
                interestRate: parseFloat(interestRate),
                purpose: purpose
            })
        });
    }

    // Get user's loan history
    async getLoanHistory() {
        return this.request('/api/loans');
    }

    // Get loan statistics
    async getLoanStats() {
        return this.request('/api/loans/stats');
    }

    // Get specific loan details
    async getLoanDetails(loanId) {
        return this.request(`/api/loans/${loanId}`);
    }

    // Get loan types and their terms
    async getLoanTypes() {
        return this.request('/api/loans/types');
    }

    // Calculate loan terms and payments (for general calculations)
    async calculateLoanTerms(amount, term, loanType) {
        return this.request('/api/loans/calculate', {
            method: 'POST',
            body: JSON.stringify({
                amount: parseFloat(amount),
                term: parseInt(term),
                loanType: loanType
            })
        });
    }
}

// Utility functions for loan calculations (client-side)
export const LoanCalculations = {
    // Calculate monthly installment using reducing balance method
    calculateMonthlyInstallment(principal, annualRate, termMonths) {
        const monthlyRate = annualRate / 12;
        
        if (monthlyRate === 0) {
            return principal / termMonths;
        }
        
        const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
        return monthlyPayment;
    },

    // Calculate maximum loan from available installment
    calculateMaxLoanFromInstallment(maxInstallment, annualRate, termMonths) {
        const monthlyRate = annualRate / 12;
        
        if (monthlyRate === 0) {
            return maxInstallment * termMonths;
        }
        
        const maxLoan = maxInstallment * ((Math.pow(1 + monthlyRate, termMonths) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, termMonths)));
        return maxLoan;
    },

    // Calculate total interest for a loan
    calculateTotalInterest(principal, annualRate, termMonths) {
        const monthlyPayment = this.calculateMonthlyInstallment(principal, annualRate, termMonths);
        const totalPayment = monthlyPayment * termMonths;
        return totalPayment - principal;
    },

    // Calculate effective interest rate
    calculateEffectiveRate(principal, totalPayment) {
        return ((totalPayment / principal) - 1) * 100;
    },

    // Format currency
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    // Format percentage
    formatPercentage(value, decimals = 1) {
        return `${value.toFixed(decimals)}%`;
    },

    // Calculate DTNI capacity
    calculateDTNICapacity(netSalary, dtniPercentage = 0.40) {
        return netSalary * dtniPercentage;
    },

    // Calculate installment utilization
    calculateInstallmentUtilization(currentInstallments, maxCapacity) {
        return (currentInstallments / maxCapacity) * 100;
    }
};

// Loan validation utilities
export const LoanValidation = {
    // Validate loan amount
    validateAmount(amount, min = 50, max = 100000) {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < min || numAmount > max) {
            return `Amount must be between $${min} and $${max}`;
        }
        return null;
    },

    // Validate term
    validateTerm(termDays, min = 30, max = 720) {
        const numTerm = parseInt(termDays);
        if (isNaN(numTerm) || numTerm < min || numTerm > max) {
            return `Term must be between ${min} and ${max} days`;
        }
        return null;
    },

    // Validate interest rate
    validateInterestRate(rate, min = 0, max = 10) {
        const numRate = parseFloat(rate);
        if (isNaN(numRate) || numRate < min || numRate > max) {
            return `Interest rate must be between ${min}% and ${max}%`;
        }
        return null;
    },

    // Validate purpose
    validatePurpose(purpose, minLength = 5, maxLength = 500) {
        if (!purpose || purpose.trim().length < minLength) {
            return `Purpose must be at least ${minLength} characters`;
        }
        if (purpose.length > maxLength) {
            return `Purpose must be less than ${maxLength} characters`;
        }
        return null;
    },

    // Validate entire loan form
    validateLoanForm(formData) {
        const errors = {};
        
        const amountError = this.validateAmount(formData.amount);
        if (amountError) errors.amount = amountError;
        
        const termError = this.validateTerm(formData.termDays);
        if (termError) errors.termDays = termError;
        
        const rateError = this.validateInterestRate(formData.interestRate);
        if (rateError) errors.interestRate = rateError;
        
        const purposeError = this.validatePurpose(formData.purpose);
        if (purposeError) errors.purpose = purposeError;
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
};

// Loan status utilities
export const LoanStatus = {
    getStatusColor(status) {
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
            case 'completed':
            case 'paid_off':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    },

    getStatusIcon(status) {
        // Returns icon name for use with icon libraries
        switch (status) {
            case 'approved':
            case 'active':
                return 'CheckCircle';
            case 'pending':
            case 'under_review':
                return 'Clock';
            case 'rejected':
            case 'defaulted':
                return 'XCircle';
            case 'completed':
            case 'paid_off':
                return 'CheckCircle2';
            default:
                return 'AlertTriangle';
        }
    },

    getStatusMessage(status) {
        switch (status) {
            case 'approved':
                return 'Your loan has been approved and is ready for disbursement';
            case 'active':
                return 'Your loan is active and payments are due';
            case 'pending':
                return 'Your application is being reviewed';
            case 'under_review':
                return 'Additional review is required for your application';
            case 'rejected':
                return 'Your loan application was not approved';
            case 'defaulted':
                return 'This loan is in default';
            case 'completed':
            case 'paid_off':
                return 'This loan has been successfully paid off';
            default:
                return 'Status unknown';
        }
    }
};

export default LoanAPI;
