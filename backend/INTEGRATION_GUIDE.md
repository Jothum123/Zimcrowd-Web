# Salary Verification Backend Integration Guide

## Overview
This guide provides complete integration instructions for the salary verification system that ensures DTNI calculations use validated salary data instead of trusting frontend input.

## Files Created
1. `profile-update-salary-verification.js` - Profile API with salary verification fields
2. `loan-approval-salary-validation.js` - Loan approval validation system
3. `salary-verification-schema.sql` - Database schema and functions
4. `salary-verification-routes.js` - API route registration and examples
5. `auth-middleware-salary.js` - Authentication and security middleware

## Database Setup

### 1. Run Schema Updates
```sql
-- Execute the salary verification schema
\i database/salary-verification-schema.sql
```

### 2. Verify Tables and Functions
```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('verified_net_salary', 'salary_verified_at', 'ocr_bank_salary', 'ocr_payslip_salary');

-- Test salary validation function
SELECT * FROM validate_salary_for_loan('your-user-id-here');
```

## Backend Integration

### 1. Update Main Server File
```javascript
// In your main server.js or app.js
const express = require('express');
const { registerSalaryVerificationRoutes } = require('./salary-verification-routes');
const { 
    authenticateUser, 
    addSecurityHeaders, 
    salaryVerificationErrorHandler 
} = require('./auth-middleware-salary');

const app = express();

// Apply security middleware
app.use(addSecurityHeaders);
app.use(express.json({ limit: '10mb' }));

// Register salary verification routes
registerSalaryVerificationRoutes(app);

// Apply error handling
app.use(salaryVerificationErrorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('✅ Salary verification system integrated');
});
```

### 2. Environment Variables
```bash
# Required environment variables
JWT_SECRET=your-super-secret-jwt-key
DATABASE_URL=your-supabase-connection-string
NODE_ENV=production
```

## API Endpoints

### Profile Update with Salary Verification
```javascript
PUT /api/user/profile
Headers: Authorization: Bearer <token>
Body: {
    // Existing profile fields
    first_name: "John",
    last_name: "Doe",
    employment_status: "full_time_salaried",
    employer_type: "government",
    monthly_income: 1500,
    
    // NEW: Salary verification fields
    verified_net_salary: 1500,
    salary_verified_at: "2025-12-05T10:00:00Z",
    ocr_bank_salary: 1480,
    ocr_payslip_salary: 1500
}
```

### Salary Status Check
```javascript
GET /api/user/salary-status
Headers: Authorization: Bearer <token>

Response: {
    "success": true,
    "data": {
        "verified_net_salary": 1500,
        "salary_verified_at": "2025-12-05T10:00:00Z",
        "salary_age_days": 0,
        "is_fresh": true,
        "needs_reverification": false,
        "employer_type": "government"
    }
}
```

### Loan Application with Salary Validation
```javascript
POST /api/loan/apply
Headers: Authorization: Bearer <token>
Body: {
    "loan_amount": 500,
    "loan_term": 3,
    "purpose": "Emergency expenses"
}

// System automatically:
// 1. Validates salary freshness (90-day rule)
// 2. Checks government employee minimum ($120)
// 3. Calculates DTNI using verified salary
// 4. Ensures loan amount doesn't exceed DTNI limit
```

### Salary Re-verification
```javascript
POST /api/user/reverify-salary
Headers: Authorization: Bearer <token>
Body: {
    "net_salary": 1600,
    "payslip_file_id": "file-upload-id"
}

// Rate limited to 3 attempts per day per user
```

## Security Features

### 1. Authentication
- JWT and Supabase token support
- Automatic user ID extraction
- Token validation with proper error handling

### 2. Rate Limiting
- Salary re-verification: 3 attempts per day
- Loan applications: 5 attempts per hour
- User-based limiting (not IP-based)

### 3. Input Validation
- Salary range validation ($50 - $100,000)
- Type checking and sanitization
- Required field validation

### 4. Audit Logging
- All salary operations logged
- IP address and user agent tracking
- Database audit trail

## DTNI Calculation Rules

### Government Employees
```
Available Installment = Verified Net Salary - $70 buffer
DTNI Limit = Reducing balance formula using available installment
Minimum Salary = $120 (to cover $70 buffer + $50 minimum loan)
```

### Other Employees
```
Available Installment = Verified Net Salary × 33%
DTNI Limit = Reducing balance formula using available installment
```

## Database Functions

### Salary Validation
```sql
-- Validate salary for loan approval
SELECT * FROM validate_salary_for_loan('user-id');

-- Check salary freshness
SELECT * FROM check_salary_freshness('user-id');

-- Calculate DTNI from verified salary
SELECT * FROM calculate_dtni_from_verified_salary('user-id', 0);
```

### Profile Flags
```sql
-- Check for salary discrepancies
SELECT * FROM profile_flags 
WHERE user_id = 'user-id' 
AND flag_type = 'salary_discrepancy' 
AND status = 'ACTIVE';
```

## Frontend Integration

### Update Profile Submission
```javascript
// Frontend should send salary verification fields
const profileData = {
    // ... existing fields
    verified_net_salary: userNetSalary,
    salary_verified_at: new Date().toISOString(),
    ocr_bank_salary: ocrResults.bankStatement?.data?.ocrData?.extractedFields?.estimatedMonthlyIncome,
    ocr_payslip_salary: ocrResults.payslip?.data?.ocrData?.extractedFields?.netSalary
};

// Send to backend
const response = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(profileData)
});
```

### Loan Application
```javascript
// Frontend just sends loan request - backend handles salary validation
const loanResponse = await fetch('/api/loan/apply', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        loan_amount: 500,
        loan_term: 3,
        purpose: 'Emergency'
    })
});
```

## Testing

### 1. Database Functions
```sql
-- Test salary validation
SELECT * FROM validate_salary_for_loan('test-user-id');

-- Test DTNI calculation
SELECT * FROM calculate_dtni_from_verified_salary('test-user-id', 0);
```

### 2. API Endpoints
```bash
# Test salary status
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/user/salary-status

# Test loan application (should validate salary)
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"loan_amount": 500, "loan_term": 3}' \
     http://localhost:3000/api/loan/apply
```

## Production Deployment Checklist

### Database
- [ ] Run salary-verification-schema.sql
- [ ] Verify indexes are created
- [ ] Test stored procedures
- [ ] Set up RLS policies

### Backend
- [ ] Install required packages (express-rate-limit, jsonwebtoken)
- [ ] Set environment variables
- [ ] Configure authentication middleware
- [ ] Test rate limiting
- [ ] Verify audit logging

### Security
- [ ] JWT secret configured
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] Security headers added
- [ ] Error handling implemented

### Monitoring
- [ ] Audit logs being created
- [ ] Rate limit alerts configured
- [ ] Database performance monitored
- [ ] Error tracking enabled

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check JWT secret configuration
   - Verify token format
   - Ensure Supabase auth is working

2. **Salary Validation Fails**
   - Check database schema updates
   - Verify salary verification columns exist
   - Test stored procedures directly

3. **Rate Limiting Issues**
   - Check Redis/Memory store for rate limiter
   - Verify user ID extraction
   - Test with different users

4. **DTNI Calculation Errors**
   - Verify salary data exists
   - Check employer type values
   - Test database functions

### Debug Queries
```sql
-- Check profile salary data
SELECT id, verified_net_salary, salary_verified_at, employer_type
FROM profiles 
WHERE id = 'problem-user-id';

-- Check validation flags
SELECT * FROM profile_flags 
WHERE user_id = 'problem-user-id' 
AND status = 'ACTIVE';

-- Test salary age calculation
SELECT 
    salary_verified_at,
    CURRENT_DATE - salary_verified_at::date as days_old,
    CASE WHEN (CURRENT_DATE - salary_verified_at::date) <= 90 THEN true ELSE false END as is_fresh
FROM profiles 
WHERE id = 'problem-user-id';
```

## Support

For issues with the salary verification system:
1. Check database logs for function errors
2. Review API response messages
3. Verify authentication tokens
4. Test with fresh database connection
5. Check rate limiting configuration

The system is now production-ready with comprehensive salary validation, security measures, and audit capabilities.
