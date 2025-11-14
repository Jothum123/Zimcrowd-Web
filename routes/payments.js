const express = require('express');
const router = express.Router();
const PayNowService = require('../services/paynow.service');
const PaymentValidatorService = require('../services/payment-validator.service');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const paynowService = new PayNowService();
const validatorService = new PaymentValidatorService();

/**
 * POST /api/payments/initiate/web
 * Initiate web payment
 */
router.post('/initiate/web', async (req, res) => {
    try {
        const { amount, reference, description, userEmail, userPhone, currency, userId, loanId } = req.body;
        
        // Build payment request
        const paymentRequest = {
            amount: parseFloat(amount),
            reference: reference || paynowService.generatePaymentReference('WEB'),
            description: description || 'Zimcrowd Payment',
            userEmail,
            userPhone,
            currency: currency || 'USD',
            additionalData: {
                userId,
                loanId,
                timestamp: new Date().toISOString()
            }
        };
        
        // Validate request
        const validation = validatorService.validatePaymentRequest(paymentRequest);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.errors.join(', '),
                errors: validation.errors
            });
        }
        
        // Log payment initiation
        await supabase
            .from('payment_transactions')
            .insert({
                reference: paymentRequest.reference,
                user_id: userId,
                loan_id: loanId,
                amount: paymentRequest.amount,
                currency: paymentRequest.currency,
                payment_method: 'web',
                status: 'pending',
                description: paymentRequest.description
            });
        
        // Initiate payment
        const response = await paynowService.initiateWebPayment(paymentRequest);
        
        if (response.success) {
            // Update transaction with PayNow details
            await supabase
                .from('payment_transactions')
                .update({
                    poll_url: response.pollUrl,
                    redirect_url: response.redirectUrl
                })
                .eq('reference', paymentRequest.reference);
            
            res.json({
                success: true,
                reference: response.reference,
                pollUrl: response.pollUrl,
                redirectUrl: response.redirectUrl,
                message: 'Payment initiated successfully'
            });
        } else {
            // Update transaction status
            await supabase
                .from('payment_transactions')
                .update({
                    status: 'failed',
                    error_message: response.error
                })
                .eq('reference', paymentRequest.reference);
            
            res.status(400).json({
                success: false,
                error: response.error
            });
        }
    } catch (error) {
        console.error('Error initiating web payment:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/payments/initiate/mobile
 * Initiate mobile money payment (EcoCash or OneMoney)
 */
router.post('/initiate/mobile', async (req, res) => {
    try {
        const { 
            amount, 
            reference, 
            description, 
            userEmail, 
            userPhone, 
            currency, 
            userId, 
            loanId,
            mobileNumber,
            paymentMethod 
        } = req.body;
        
        // Build payment request
        const paymentRequest = {
            amount: parseFloat(amount),
            reference: reference || paynowService.generatePaymentReference(paymentMethod.toUpperCase()),
            description: description || 'Zimcrowd Payment',
            userEmail,
            userPhone,
            currency: currency || 'USD',
            additionalData: {
                userId,
                loanId,
                timestamp: new Date().toISOString()
            }
        };
        
        // Validate mobile money request
        const validation = validatorService.validateMobileMoneyRequest(
            paymentRequest,
            mobileNumber,
            paymentMethod
        );
        
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.errors.join(', '),
                errors: validation.errors
            });
        }
        
        // Log payment initiation
        await supabase
            .from('payment_transactions')
            .insert({
                reference: paymentRequest.reference,
                user_id: userId,
                loan_id: loanId,
                amount: paymentRequest.amount,
                currency: paymentRequest.currency,
                payment_method: paymentMethod,
                mobile_number: mobileNumber,
                status: 'pending',
                description: paymentRequest.description
            });
        
        // Initiate mobile money payment
        const response = await paynowService.initiateMobileMoneyPayment(
            paymentRequest,
            mobileNumber,
            paymentMethod
        );
        
        if (response.success) {
            // Update transaction with PayNow details
            await supabase
                .from('payment_transactions')
                .update({
                    poll_url: response.pollUrl
                })
                .eq('reference', paymentRequest.reference);
            
            res.json({
                success: true,
                reference: response.reference,
                pollUrl: response.pollUrl,
                instructions: response.instructions,
                message: 'Payment initiated successfully'
            });
        } else {
            // Update transaction status
            await supabase
                .from('payment_transactions')
                .update({
                    status: 'failed',
                    error_message: response.error
                })
                .eq('reference', paymentRequest.reference);
            
            res.status(400).json({
                success: false,
                error: response.error
            });
        }
    } catch (error) {
        console.error('Error initiating mobile payment:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/payments/status/:reference
 * Check payment status
 */
router.get('/status/:reference', async (req, res) => {
    try {
        const { reference } = req.params;
        
        // Get transaction from database
        const { data: transaction, error } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('reference', reference)
            .single();
        
        if (error || !transaction) {
            return res.status(404).json({
                success: false,
                error: 'Payment not found'
            });
        }
        
        // If already completed, return cached status
        if (transaction.status === 'paid' || transaction.status === 'failed') {
            return res.json({
                success: true,
                status: transaction.status,
                paid: transaction.status === 'paid',
                reference: transaction.reference,
                amount: transaction.amount,
                currency: transaction.currency,
                paidAt: transaction.paid_at
            });
        }
        
        // Check status with PayNow
        const statusResponse = await paynowService.checkPaymentStatus(
            transaction.poll_url,
            reference
        );
        
        if (statusResponse.success) {
            // Update transaction in database
            const updateData = {
                status: statusResponse.status,
                last_checked_at: new Date().toISOString()
            };
            
            if (statusResponse.paid) {
                updateData.paid_at = new Date().toISOString();
                updateData.paynow_reference = statusResponse.paynowReference;
            }
            
            await supabase
                .from('payment_transactions')
                .update(updateData)
                .eq('reference', reference);
            
            res.json({
                success: true,
                status: statusResponse.status,
                paid: statusResponse.paid,
                reference: statusResponse.reference,
                amount: statusResponse.amount,
                currency: statusResponse.currency,
                paynowReference: statusResponse.paynowReference
            });
        } else {
            res.status(400).json({
                success: false,
                error: statusResponse.error
            });
        }
    } catch (error) {
        console.error('Error checking payment status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/payments/result
 * PayNow result callback endpoint
 */
router.post('/result', async (req, res) => {
    try {
        const { reference, paynowreference, status, amount, pollurl } = req.body;
        
        console.log('📥 PayNow result callback:', { reference, status });
        
        // Update transaction in database
        const updateData = {
            status: status.toLowerCase(),
            paynow_reference: paynowreference,
            last_checked_at: new Date().toISOString()
        };
        
        if (status.toLowerCase() === 'paid') {
            updateData.paid_at = new Date().toISOString();
        }
        
        const { error } = await supabase
            .from('payment_transactions')
            .update(updateData)
            .eq('reference', reference);
        
        if (error) {
            console.error('Error updating transaction:', error);
        }
        
        // Respond to PayNow
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing PayNow result:', error);
        res.status(500).send('ERROR');
    }
});

/**
 * GET /api/payments/methods/:currency
 * Get available payment methods for currency
 */
router.get('/methods/:currency', (req, res) => {
    try {
        const { currency } = req.params;
        
        // Validate currency
        const validation = validatorService.validateCurrency(currency);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.errors.join(', ')
            });
        }
        
        const methods = paynowService.getPaymentMethodsForCurrency(currency.toUpperCase());
        
        res.json({
            success: true,
            currency: currency.toUpperCase(),
            methods
        });
    } catch (error) {
        console.error('Error getting payment methods:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/payments/currencies
 * Get supported currencies
 */
router.get('/currencies', (req, res) => {
    try {
        const currencies = paynowService.getSupportedCurrencies();
        
        res.json({
            success: true,
            currencies
        });
    } catch (error) {
        console.error('Error getting currencies:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/payments/history/:userId
 * Get user's payment history
 */
router.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const { data: transactions, error } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) throw error;
        
        res.json({
            success: true,
            transactions: transactions || [],
            count: transactions?.length || 0
        });
    } catch (error) {
        console.error('Error getting payment history:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/payments/validate
 * Validate payment request without initiating
 */
router.post('/validate', (req, res) => {
    try {
        const { amount, currency, userEmail, userPhone, paymentMethod, mobileNumber } = req.body;
        
        const paymentRequest = {
            amount: parseFloat(amount),
            reference: 'VALIDATION_TEST',
            description: 'Validation',
            userEmail,
            userPhone,
            currency
        };
        
        let validation;
        
        if (paymentMethod === 'ecocash' || paymentMethod === 'onemoney') {
            validation = validatorService.validateMobileMoneyRequest(
                paymentRequest,
                mobileNumber,
                paymentMethod
            );
        } else {
            validation = validatorService.validatePaymentRequest(paymentRequest);
        }
        
        res.json({
            success: validation.valid,
            valid: validation.valid,
            errors: validation.errors || []
        });
    } catch (error) {
        console.error('Error validating payment:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
