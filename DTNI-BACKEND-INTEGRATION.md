# DTNI Backend Integration Guide

## Critical Security Requirements

**⚠️ WARNING**: Frontend DTNI calculations are for DISPLAY ONLY and cannot be trusted for actual loan approval decisions. All loan applications MUST perform backend DTNI verification using verified bank statement data.

## DTNI Formula Implementation (Backend)

### Required Parameters
```javascript
{
  monthly_income: number,        // From verified bank statement
  employment_type: string,       // 'government' or 'other'
  existing_debt: number,         // Monthly debt payments from bank statement
  tenure_days: number,           // Selected loan repayment period
  cold_start_limit: number,      // Employer-specific cold start cap
  max_loan_amount: number        // Employer-specific maximum limit
}
```

### DTNI Calculation Function
```javascript
function calculateDTNILimit(params) {
    // Step 1: Calculate DTNI percentage
    const dtniPercent = params.employment_type === 'government' ? 0.40 : 0.33;
    
    // Step 2: Calculate maximum monthly installment
    const maxInstallment = params.monthly_income * dtniPercent;
    
    // Step 3: Calculate available installment
    const availableInstallment = maxInstallment - params.existing_debt;
    
    // Step 4: Check if DTNI is too high
    if (availableInstallment <= 0) {
        return {
            maxLoan: 0,
            status: 'DENIED',
            reason: 'DTNI too high - existing debt exceeds allowable limit',
            dtniPercent: dtniPercent * 100,
            utilization: '100%+'
        };
    }
    
    // Step 5: Calculate maximum loan using reducing balance formula
    const annualRate = 0.05;
    const monthlyRate = annualRate / 12;
    const termMonths = Math.ceil(params.tenure_days / 30);
    
    const powerTerm = Math.pow(1 + monthlyRate, termMonths);
    const maxLoanFromDTNI = (availableInstallment * (powerTerm - 1)) / (monthlyRate * powerTerm);
    
    // Step 6: Apply employer-specific caps
    let finalMaxLoan;
    if (params.is_cold_start) {
        finalMaxLoan = Math.min(maxLoanFromDTNI, params.cold_start_limit);
    } else {
        finalMaxLoan = Math.min(maxLoanFromDTNI, params.max_loan_amount);
    }
    
    // Step 7: Calculate utilization percentage
    const utilization = (params.existing_debt / maxInstallment) * 100;
    
    return {
        maxLoan: Math.round(finalMaxLoan),
        dtniBasedLimit: Math.round(maxLoanFromDTNI),
        dtniPercent: dtniPercent * 100,
        utilization: utilization.toFixed(1) + '%',
        status: utilization >= 100 ? 'DENIED' : 'APPROVED',
        maxInstallment: maxInstallment,
        availableInstallment: availableInstallment
    };
}
```

## Loan Application Flow Integration

### Required Endpoint: `/api/loans/apply`

**MUST perform the following steps before loan approval:**

1. **Verify Bank Statement**: Parse and validate the uploaded bank statement
2. **Extract Monthly Income**: Calculate average monthly income from statement
3. **Identify Existing Debt**: Detect recurring debt payments
4. **Calculate DTNI**: Call `calculateDTNILimit()` with verified data
5. **Apply Employer Rules**: Use employer-specific caps from database
6. **Final Approval**: Only approve if DTNI calculation passes

### Sample Implementation
```javascript
app.post('/api/loans/apply', async (req, res) => {
    const { user_id, loan_amount, tenure_days, employer_type, employment_type } = req.body;
    
    // 1. Get user's verified bank statement data
    const bankStatement = await getVerifiedBankStatement(user_id);
    if (!bankStatement) {
        return res.status(400).json({ error: 'Bank statement verification required' });
    }
    
    // 2. Extract income and debt from statement
    const monthlyIncome = bankStatement.averageMonthlyIncome;
    const existingDebt = bankStatement.totalMonthlyDebt;
    
    // 3. Get employer-specific rules
    const employerRules = await getEmployerRules(employment_type, employer_type);
    
    // 4. Check if user is in cold start period
    const isColdStart = await checkColdStartStatus(user_id);
    
    // 5. Calculate DTNI limit
    const dtniResult = calculateDTNILimit({
        monthly_income: monthlyIncome,
        employment_type: employment_type,
        existing_debt: existingDebt,
        tenure_days: tenure_days,
        cold_start_limit: employerRules.cold_start_limit,
        max_loan_amount: employerRules.max_loan_amount,
        is_cold_start: isColdStart
    });
    
    // 6. Verify loan amount doesn't exceed DTNI limit
    if (loan_amount > dtniResult.maxLoan) {
        return res.status(400).json({ 
            error: 'Loan amount exceeds DTNI limit',
            maxAllowed: dtniResult.maxLoan,
            dtniDetails: dtniResult
        });
    }
    
    // 7. Approve loan if all checks pass
    const loan = await createLoan({
        user_id,
        amount: loan_amount,
        tenure_days,
        dtni_limit: dtniResult.maxLoan,
        dtni_percent: dtniResult.dtniPercent,
        utilization: dtniResult.utilization
    });
    
    res.json({ success: true, loan, dtniDetails: dtniResult });
});
```

## Database Schema Updates

### Update Profiles Table
```sql
-- Add DTNI-related fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dtni_based_limit DECIMAL(10,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS final_cold_start_limit DECIMAL(10,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS final_max_loan_limit DECIMAL(10,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS income_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_dtni_calculation TIMESTAMP WITH TIME ZONE;
```

### Update Enhanced Cold Start Function
```sql
CREATE OR REPLACE FUNCTION calculate_enhanced_cold_start_rating(
    p_user_id UUID,
    p_employment_type VARCHAR(50),
    p_employer_type VARCHAR(50),
    p_submitted_documents TEXT[],
    p_monthly_income DECIMAL(10,2) DEFAULT NULL,
    p_existing_debt DECIMAL(10,2) DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    v_rating_record RECORD;
    v_base_score INTEGER;
    v_final_score INTEGER;
    v_dtni_limit DECIMAL(10,2);
    v_final_limit DECIMAL(10,2);
BEGIN
    -- Get employer-specific rules
    SELECT * INTO v_rating_record 
    FROM employment_employer_rating_matrix 
    WHERE employment_type = p_employment_type 
    AND employer_type = p_employer_type 
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Employer combination not found');
    END IF;
    
    -- Calculate base score
    v_base_score := v_rating_record.base_score;
    
    -- Add documentation bonus if all required documents submitted
    IF p_submitted_documents @> ARRAY(SELECT required_document FROM employer_type_config WHERE employer_type = p_employer_type) THEN
        v_final_score := v_base_score + v_rating_record.documentation_bonus;
    ELSE
        v_final_score := v_base_score;
    END IF;
    
    -- Calculate DTNI limit if income provided
    IF p_monthly_income IS NOT NULL THEN
        -- Simplified DTNI calculation for storage
        v_dtni_limit := (p_monthly_income * (CASE WHEN p_employment_type = 'government' THEN 0.40 ELSE 0.33 END) - p_existing_debt) * 3;
        v_final_limit := LEAST(v_rating_record.cold_start_limit, v_dtni_limit);
    ELSE
        v_dtni_limit := 0;
        v_final_limit := v_rating_record.cold_start_limit;
    END IF;
    
    -- Update profiles table with DTNI information
    UPDATE profiles SET
        cold_start_rating = v_final_score,
        employer_type = p_employer_type,
        dtni_based_limit = v_dtni_limit,
        final_cold_start_limit = v_final_limit,
        income_verified = (p_monthly_income IS NOT NULL),
        last_dtni_calculation = NOW()
    WHERE user_id = p_user_id;
    
    RETURN json_build_object(
        'rating', v_final_score,
        'base_score', v_base_score,
        'risk_level', v_rating_record.risk_level,
        'dtni_based_limit', v_dtni_limit,
        'final_limit', v_final_limit,
        'has_cold_start', v_rating_record.has_cold_start,
        'income_verified', (p_monthly_income IS NOT NULL)
    );
END;
$$ LANGUAGE plpgsql;
```

## Security Considerations

### NEVER Trust Frontend Data
- Frontend `localStorage` values are for display only
- Always recalculate DTNI using verified bank statement data
- Validate all parameters before processing

### Required Document Verification
- Bank statement must be verified before DTNI calculation
- Income must be extracted from actual statement data
- Existing debt must be identified from statement transactions

### Audit Trail
- Store all DTNI calculations in database
- Log calculation parameters and results
- Track changes in income and debt over time

## Testing Requirements

### Test Cases
1. **Government Employee**: 40% DTNI, no cold start, high income
2. **Private Employee**: 33% DTNI, $300 cold start, medium income  
3. **Informal Employee**: 33% DTNI, $100 cold start, low income
4. **High Debt**: DTNI > 100%, should be denied
5. **Zero Income**: Should be denied or show minimum limits

### Validation Checks
- DTNI percentage correctly applied (40% vs 33%)
- Reducing balance formula accurately calculated
- Employer caps properly enforced
- Cold start status correctly identified

## Implementation Checklist

- [ ] Update `/api/loans/apply` endpoint with DTNI calculation
- [ ] Add DTNI fields to profiles table
- [ ] Update `calculate_enhanced_cold_start_rating` function
- [ ] Implement bank statement parsing for income/debt extraction
- [ ] Add DTNI calculation logging and audit trail
- [ ] Create admin dashboard for DTNI monitoring
- [ ] Test all employer type combinations
- [ ] Verify cold start removal after first repayment

**⚠️ CRITICAL**: Do not deploy loan application without proper DTNI backend verification!
