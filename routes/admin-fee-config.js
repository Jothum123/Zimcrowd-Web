/**
 * Admin Fee Configuration Routes
 * Comprehensive fee management for borrowers and lenders
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');
const { requireAdmin } = require('../middleware/auth');
const { adminAIRateLimit } = require('../middleware/admin-rate-limit');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// @route   GET /api/admin/fee-config
// @desc    Get all fee configuration parameters
// @access  Admin
router.get('/',
    requireAdmin,
    async (req, res) => {
        try {
            const { config_type, target_key } = req.query;
            
            let query = supabase
                .from('fee_config_summary')
                .select('*')
                .order('fee_category', { ascending: true })
                .order('parameter_name', { ascending: true });
            
            if (config_type) {
                query = query.eq('config_type', config_type);
            }
            
            if (target_key) {
                query = query.eq('target_key', target_key);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            // Group fees by category for better UI display
            const groupedFees = data?.reduce((acc, fee) => {
                if (!acc[fee.fee_category]) {
                    acc[fee.fee_category] = [];
                }
                acc[fee.fee_category].push(fee);
                return acc;
            }, {}) || {};
            
            res.json({
                success: true,
                data: {
                    fees: data || [],
                    groupedFees: groupedFees,
                    categories: Object.keys(groupedFees)
                }
            });
            
        } catch (error) {
            console.error('❌ Fee config get error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get fee configuration',
                error: error.message
            });
        }
    }
);

// @route   POST /api/admin/fee-config
// @desc    Create or update fee configuration
// @access  Admin
router.post('/',
    requireAdmin,
    adminAIRateLimit,
    body('config_type').isIn(['global', 'loan_type', 'employment_type', 'user_override']).withMessage('Valid config type required'),
    body('target_key').notEmpty().withMessage('Target key is required'),
    body('parameter_name').notEmpty().withMessage('Parameter name is required'),
    body('parameter_value').isDecimal().withMessage('Parameter value must be a number'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { config_type, target_key, parameter_name, parameter_value, reason } = req.body;
            const adminId = req.user.id;
            
            // Check if parameter exists
            const { data: existingConfig, error: checkError } = await supabase
                .from('loan_config')
                .select('*')
                .eq('config_type', config_type)
                .eq('target_key', target_key)
                .eq('parameter_name', parameter_name)
                .single();
            
            let oldValue = null;
            let actionType = 'CREATE';
            
            if (existingConfig && !checkError) {
                oldValue = existingConfig.parameter_value;
                actionType = 'UPDATE';
                
                // Update existing configuration
                const { error: updateError } = await supabase
                    .from('loan_config')
                    .update({
                        parameter_value: parameter_value,
                        updated_by: adminId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('config_type', config_type)
                    .eq('target_key', target_key)
                    .eq('parameter_name', parameter_name);
                
                if (updateError) throw updateError;
            } else {
                // Create new configuration
                const { error: insertError } = await supabase
                    .from('loan_config')
                    .insert({
                        config_type: config_type,
                        target_key: target_key,
                        parameter_name: parameter_name,
                        parameter_value: parameter_value,
                        created_by: adminId,
                        is_active: true
                    });
                
                if (insertError) throw insertError;
            }
            
            // Log the change in audit trail
            const { error: auditError } = await supabase
                .from('loan_config_audit_log')
                .insert({
                    config_id: existingConfig?.id || null,
                    admin_id: adminId,
                    action_type: actionType,
                    old_value: oldValue,
                    new_value: parameter_value,
                    parameter_name: parameter_name,
                    config_type: config_type,
                    target_key: target_key,
                    reason: reason || `${actionType.toLowerCase()} fee configuration`,
                    timestamp: new Date().toISOString(),
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent')
                });
            
            if (auditError) throw auditError;
            
            res.json({
                success: true,
                message: `Fee configuration ${actionType.toLowerCase()}d successfully`,
                data: {
                    config_type,
                    target_key,
                    parameter_name,
                    parameter_value,
                    action_type: actionType,
                    old_value: oldValue
                }
            });
            
        } catch (error) {
            console.error('❌ Fee config update error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update fee configuration',
                error: error.message
            });
        }
    }
);

// @route   POST /api/admin/fee-config/batch
// @desc    Update multiple fee configurations at once
// @access  Admin
router.post('/batch',
    requireAdmin,
    adminAIRateLimit,
    body('fees').isArray().withMessage('Fees must be an array'),
    body('fees.*.config_type').isIn(['global', 'loan_type', 'employment_type', 'user_override']).withMessage('Valid config type required'),
    body('fees.*.target_key').notEmpty().withMessage('Target key is required'),
    body('fees.*.parameter_name').notEmpty().withMessage('Parameter name is required'),
    body('fees.*.parameter_value').isDecimal().withMessage('Parameter value must be a number'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { fees, reason } = req.body;
            const adminId = req.user.id;
            
            const results = [];
            const auditLogs = [];
            
            for (const feeConfig of fees) {
                const { config_type, target_key, parameter_name, parameter_value } = feeConfig;
                
                // Check if parameter exists
                const { data: existingConfig, error: checkError } = await supabase
                    .from('loan_config')
                    .select('*')
                    .eq('config_type', config_type)
                    .eq('target_key', target_key)
                    .eq('parameter_name', parameter_name)
                    .single();
                
                let oldValue = null;
                let actionType = 'CREATE';
                
                if (existingConfig && !checkError) {
                    oldValue = existingConfig.parameter_value;
                    actionType = 'UPDATE';
                    
                    // Update existing configuration
                    const { error: updateError } = await supabase
                        .from('loan_config')
                        .update({
                            parameter_value: parameter_value,
                            updated_by: adminId,
                            updated_at: new Date().toISOString()
                        })
                        .eq('config_type', config_type)
                        .eq('target_key', target_key)
                        .eq('parameter_name', parameter_name);
                    
                    if (updateError) throw updateError;
                } else {
                    // Create new configuration
                    const { error: insertError } = await supabase
                        .from('loan_config')
                        .insert({
                            config_type: config_type,
                            target_key: target_key,
                            parameter_name: parameter_name,
                            parameter_value: parameter_value,
                            created_by: adminId,
                            is_active: true
                        });
                    
                    if (insertError) throw insertError;
                }
                
                results.push({
                    config_type,
                    target_key,
                    parameter_name,
                    parameter_value,
                    action_type: actionType,
                    old_value: oldValue
                });
                
                auditLogs.push({
                    config_id: existingConfig?.id || null,
                    admin_id: adminId,
                    action_type: actionType,
                    old_value: oldValue,
                    new_value: parameter_value,
                    parameter_name: parameter_name,
                    config_type: config_type,
                    target_key: target_key,
                    reason: reason || `Batch update fee configuration`,
                    timestamp: new Date().toISOString(),
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent')
                });
            }
            
            // Log all changes in audit trail
            if (auditLogs.length > 0) {
                const { error: auditError } = await supabase
                    .from('loan_config_audit_log')
                    .insert(auditLogs);
                
                if (auditError) throw auditError;
            }
            
            res.json({
                success: true,
                message: `${results.length} fee configurations updated successfully`,
                data: {
                    updated: results.length,
                    changes: results
                }
            });
            
        } catch (error) {
            console.error('❌ Batch fee config update error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update fee configurations',
                error: error.message
            });
        }
    }
);

// @route   GET /api/admin/fee-config/history
// @desc    Get fee configuration change history
// @access  Admin
router.get('/history',
    requireAdmin,
    async (req, res) => {
        try {
            const { limit = 50, admin_id, fee_category } = req.query;
            
            let query = supabase
                .from('fee_config_history')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(parseInt(limit));
            
            if (admin_id) {
                query = query.eq('admin_id', admin_id);
            }
            
            if (fee_category) {
                query = query.eq('fee_category', fee_category);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            res.json({
                success: true,
                data: {
                    history: data || [],
                    count: data?.length || 0
                }
            });
            
        } catch (error) {
            console.error('❌ Fee config history error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get fee configuration history',
                error: error.message
            });
        }
    }
);

// @route   POST /api/admin/fee-config/calculate
// @desc    Calculate fees for a given loan amount
// @access  Admin
router.post('/calculate',
    requireAdmin,
    body('loan_amount').isDecimal().withMessage('Loan amount must be a number'),
    body('loan_type').optional().isString().withMessage('Loan type must be a string'),
    body('user_role').isIn(['borrower', 'lender']).withMessage('User role must be borrower or lender'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { loan_amount, loan_type = 'direct', user_role } = req.body;
            
            const { data, error } = await supabase
                .rpc('calculate_loan_fees', {
                    p_loan_amount: parseFloat(loan_amount),
                    p_loan_type: loan_type,
                    p_user_role: user_role
                });
            
            if (error) throw error;
            
            // Calculate total fees
            const totalFees = data?.reduce((sum, fee) => sum + (fee.fee_amount || 0), 0) || 0;
            
            res.json({
                success: true,
                data: {
                    loan_amount: parseFloat(loan_amount),
                    user_role: user_role,
                    loan_type: loan_type,
                    fees: data || [],
                    total_fees: totalFees,
                    net_amount: parseFloat(loan_amount) - totalFees
                }
            });
            
        } catch (error) {
            console.error('❌ Fee calculation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to calculate fees',
                error: error.message
            });
        }
    }
);

// @route   GET /api/admin/fee-config/categories
// @desc    Get fee categories and available parameters
// @access  Admin
router.get('/categories',
    requireAdmin,
    async (req, res) => {
        try {
            const feeCategories = {
                'Borrower Fees': [
                    'processing_fee_borrower', 'processing_fee_borrower_type', 'processing_fee_borrower_max',
                    'platform_fee_borrower', 'platform_fee_borrower_type', 'platform_fee_borrower_max',
                    'collection_fee_borrower', 'collection_fee_borrower_type', 'collection_fee_borrower_max',
                    'late_payment_fee_borrower', 'late_payment_fee_borrower_type', 'late_payment_fee_borrower_max',
                    'early_repayment_fee_borrower', 'early_repayment_fee_borrower_type', 'early_repayment_fee_borrower_max',
                    'disbursement_fee_borrower', 'disbursement_fee_borrower_type', 'disbursement_fee_borrower_max',
                    'insurance_fee_borrower', 'insurance_fee_borrower_type', 'insurance_fee_borrower_max',
                    'document_verification_fee_borrower', 'document_verification_fee_borrower_type', 'document_verification_fee_borrower_max',
                    'credit_score_check_fee_borrower', 'credit_score_check_fee_borrower_type', 'credit_score_check_fee_borrower_max',
                    'early_settlement_fee_borrower', 'early_settlement_fee_borrower_type', 'early_settlement_fee_borrower_max'
                ],
                'Lender Fees': [
                    'processing_fee_lender', 'processing_fee_lender_type', 'processing_fee_lender_max',
                    'platform_fee_lender', 'platform_fee_lender_type', 'platform_fee_lender_max',
                    'withdrawal_fee_lender', 'withdrawal_fee_lender_type', 'withdrawal_fee_lender_max',
                    'investment_fee_lender', 'investment_fee_lender_type', 'investment_fee_lender_max',
                    'default_recovery_fee_lender', 'default_recovery_fee_lender_type', 'default_recovery_fee_lender_max',
                    'portfolio_management_fee_lender', 'portfolio_management_fee_lender_type', 'portfolio_management_fee_lender_max',
                    'secondary_market_fee_lender', 'secondary_market_fee_lender_type', 'secondary_market_fee_lender_max',
                    'due_diligence_fee_lender', 'due_diligence_fee_lender_type', 'due_diligence_fee_lender_max'
                ],
                'Tiered Pricing': [
                    'tier_1_min_amount', 'tier_1_max_amount', 'tier_1_fee_multiplier',
                    'tier_2_min_amount', 'tier_2_max_amount', 'tier_2_fee_multiplier',
                    'tier_3_min_amount', 'tier_3_max_amount', 'tier_3_fee_multiplier',
                    'tier_4_min_amount', 'tier_4_max_amount', 'tier_4_fee_multiplier'
                ],
                'Fee Configuration': [
                    'fee_calculation_method',
                    'minimum_fee_threshold',
                    'maximum_fee_threshold'
                ]
            };
            
            const configTypes = [
                { value: 'global', label: 'Global Configuration' },
                { value: 'loan_type', label: 'Loan Type Specific' },
                { value: 'employment_type', label: 'Employment Type Specific' },
                { value: 'user_override', label: 'User Override' }
            ];
            
            const feeTypes = [
                { value: 1.00, label: 'Percentage' },
                { value: 2.00, label: 'Fixed Amount' }
            ];
            
            res.json({
                success: true,
                data: {
                    categories: feeCategories,
                    config_types: configTypes,
                    fee_types: feeTypes,
                    total_parameters: Object.values(feeCategories).flat().length
                }
            });
            
        } catch (error) {
            console.error('❌ Fee categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get fee categories',
                error: error.message
            });
        }
    }
);

// @route   DELETE /api/admin/fee-config/:config_type/:target_key/:parameter_name
// @desc    Deactivate a fee configuration
// @access  Admin
router.delete('/:config_type/:target_key/:parameter_name',
    requireAdmin,
    adminAIRateLimit,
    async (req, res) => {
        try {
            const { config_type, target_key, parameter_name } = req.params;
            const adminId = req.user.id;
            
            // Get current config for audit
            const { data: currentConfig, error: checkError } = await supabase
                .from('loan_config')
                .select('*')
                .eq('config_type', config_type)
                .eq('target_key', target_key)
                .eq('parameter_name', parameter_name)
                .single();
            
            if (checkError || !currentConfig) {
                return res.status(404).json({
                    success: false,
                    message: 'Fee configuration not found'
                });
            }
            
            // Deactivate the configuration
            const { error: updateError } = await supabase
                .from('loan_config')
                .update({
                    is_active: false,
                    updated_by: adminId,
                    updated_at: new Date().toISOString()
                })
                .eq('config_type', config_type)
                .eq('target_key', target_key)
                .eq('parameter_name', parameter_name);
            
            if (updateError) throw updateError;
            
            // Log the deactivation
            const { error: auditError } = await supabase
                .from('loan_config_audit_log')
                .insert({
                    config_id: currentConfig.id,
                    admin_id: adminId,
                    action_type: 'DEACTIVATE',
                    old_value: currentConfig.parameter_value,
                    new_value: currentConfig.parameter_value,
                    parameter_name: parameter_name,
                    config_type: config_type,
                    target_key: target_key,
                    reason: 'Deactivated fee configuration',
                    timestamp: new Date().toISOString(),
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent')
                });
            
            if (auditError) throw auditError;
            
            res.json({
                success: true,
                message: 'Fee configuration deactivated successfully',
                data: {
                    config_type,
                    target_key,
                    parameter_name,
                    deactivated_at: new Date().toISOString()
                }
            });
            
        } catch (error) {
            console.error('❌ Fee config deactivation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to deactivate fee configuration',
                error: error.message
            });
        }
    }
);

module.exports = router;
