# Production Deployment Guide - Salary Verification System

## 🎯 **Overview**
Complete end-to-end deployment guide for the ZimCrowd salary verification system with live data integration.

## 📋 **System Components**

### **Backend Components**
- `salary-verification-api.js` - Express API server
- `supabase/client.js` - Database connection
- `auth-middleware-salary.js` - Authentication & security
- `loan-approval-salary-validation.js` - Business logic
- `profile-update-salary-verification.js` - Profile management

### **Database Components**
- `document-management-final.sql` - Document storage
- `employer-type-rating.sql` - DTNI system & government rules
- `salary-verification-schema.sql` - Validation functions & indexes
- `seed-salary-verification-data.sql` - Test data

### **Frontend Components**
- `salary-verification-service.js` - API integration layer
- `post-registration.html` - Updated with live API calls

---

## 🛠️ **Prerequisites**

### **System Requirements**
- Node.js 16+ and npm 8+
- PostgreSQL 12+ (via Supabase)
- Git for version control

### **Required Services**
- Supabase account (database & auth)
- Domain name (for production)
- SSL certificate (for HTTPS)

---

## 📦 **Step 1: Backend Setup**

### **1.1 Install Dependencies**
```bash
cd backend
npm install
```

### **1.2 Environment Configuration**
```bash
# Copy environment template
cp ../.env.example .env

# Edit with your actual values
nano .env
```

**Required .env variables:**
```bash
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-super-secret-jwt-key
ALLOWED_ORIGINS=https://your-domain.com
```

### **1.3 Verify Supabase Connection**
```bash
node -e "require('./supabase/client.js')"
```

---

## 🗄️ **Step 2: Database Setup**

### **2.1 Run Database Migrations**
Execute SQL files in **exact order**:

```bash
# Connect to your Supabase database
psql "postgresql://user:password@host:port/database"

# Execute migration scripts
\i database/document-management-final.sql
\i database/employer-type-rating.sql  
\i database/salary-verification-schema.sql
```

### **2.2 Verify Database Schema**
```sql
-- Check tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_documents', 'profile_flags', 'employer_type_config');

-- Check functions exist
SELECT proname FROM pg_proc 
WHERE proname IN ('validate_salary_for_loan', 'calculate_dtni_from_verified_salary', 'check_salary_freshness');
```

### **2.3 Seed Test Data**
```sql
-- Load test users with salary verification data
\i database/seed-salary-verification-data.sql
```

### **2.4 Verify Test Data**
```sql
-- Check test users were created
SELECT id, email, employer_type, verified_net_salary, salary_verified_at
FROM profiles 
WHERE id LIKE 'test-%';
```

---

## 🚀 **Step 3: Start Production Server**

### **3.1 Start API Server**
```bash
cd backend
npm start
```

**Expected output:**
```
🚀 Salary Verification API running on port 3000
💚 API Health: http://localhost:3000/api/health
💰 Salary status: http://localhost:3000/api/salary-verification/status
✅ Production endpoints ready for live data
```

### **3.2 Health Check**
```bash
curl http://localhost:3000/api/health
```

**Expected response:**
```json
{
  "success": true,
  "message": "Salary Verification API is running",
  "timestamp": "2025-12-05T10:00:00.000Z",
  "version": "1.0.0"
}
```

---

## 🌐 **Step 4: Frontend Integration**

### **4.1 Update Frontend Configuration**
Edit `post-registration.html` to match your API base URL:

```javascript
// In salary-verification-service.js
const apiBase = process.env.REACT_APP_API_BASE || 'https://your-api-domain.com';
```

### **4.2 Test Frontend Integration**
Open `post-registration.html` in browser and check console:
```
💰 Salary Verification Service initialized
✅ Salary Verification API is healthy
🔄 Initializing live salary verification...
✅ Live salary verification initialized
```

---

## 🧪 **Step 5: End-to-End Testing**

### **5.1 Test Salary Status Endpoint**
```bash
# Get auth token first (from your login system)
TOKEN="your-jwt-token-here"

curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/salary-verification/status
```

### **5.2 Test Salary Validation**
```bash
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:3000/api/salary-verification/validate
```

### **5.3 Test DTNI Calculation**
```bash
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"existing_debt": 0}' \
     http://localhost:3000/api/salary-verification/calculate-dtni
```

### **5.4 Test Loan Application**
```bash
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"loan_amount": 500, "loan_term": 3, "purpose": "Emergency"}' \
     http://localhost:3000/api/loan/apply
```

---

## 🔐 **Step 6: Security Verification**

### **6.1 Test Authentication**
```bash
# Test without token (should fail)
curl http://localhost:3000/api/salary-verification/status
# Expected: 401 Unauthorized

# Test with invalid token (should fail)  
curl -H "Authorization: Bearer invalid-token" \
     http://localhost:3000/api/salary-verification/status
# Expected: 403 Forbidden
```

### **6.2 Test Rate Limiting**
```bash
# Make many rapid requests (should be rate limited)
for i in {1..10}; do
  curl -X POST \
       -H "Authorization: Bearer $TOKEN" \
       http://localhost:3000/api/salary-verification/reverify \
       -d '{"net_salary": 1500}'
done
# Expected: Rate limit after 3 attempts
```

---

## 📊 **Step 7: Production Monitoring**

### **7.1 Check System Health**
```bash
# API health
curl https://your-domain.com/api/health

# Database connection
curl -H "Authorization: Bearer $TOKEN" \
     https://your-domain.com/api/salary-verification/status
```

### **7.2 Monitor Key Metrics**
- Salary verification success rate
- DTNI calculation accuracy  
- Government employee rule compliance
- API response times
- Error rates

---

## 🚨 **Troubleshooting**

### **Common Issues**

**1. "Supabase connection failed"**
- Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
- Verify database URL is accessible
- Check network connectivity

**2. "Authentication expired"**
- Check JWT_SECRET configuration
- Verify token format in localStorage
- Check token expiration time

**3. "Salary validation failed"**
- Ensure database functions exist: `\df validate_salary_for_loan`
- Check user has salary verification data
- Verify salary_verified_at is within 90 days

**4. "Rate limit exceeded"**
- Wait for rate limit window to reset (15 minutes)
- Check RATE_LIMIT_MAX_REQUESTS in .env
- Verify rate limiting is working as expected

### **Debug Queries**
```sql
-- Check user salary data
SELECT id, verified_net_salary, salary_verified_at, employer_type
FROM profiles 
WHERE id = 'your-user-uuid';

-- Check validation flags
SELECT * FROM profile_flags 
WHERE user_id = 'your-user-uuid' 
AND status = 'ACTIVE';

-- Test functions directly
SELECT * FROM validate_salary_for_loan('your-user-uuid');
SELECT * FROM calculate_dtni_from_verified_salary('your-user-uuid', 0);
```

---

## ✅ **Deployment Checklist**

### **Database**
- [ ] All 3 SQL files executed in order
- [ ] Functions created and tested
- [ ] Test data seeded successfully
- [ ] Indexes created for performance

### **Backend**
- [ ] Dependencies installed (`npm install`)
- [ ] Environment configured (.env file)
- [ ] Supabase connection working
- [ ] API server starts successfully
- [ ] Health check passes

### **Security**
- [ ] JWT authentication working
- [ ] Rate limiting active
- [ ] CORS configured properly
- [ ] HTTPS enabled in production

### **Frontend**
- [ ] Service layer integrated
- [ ] API calls working
- [ ] Fallback mechanisms active
- [ ] Error handling functional

### **Testing**
- [ ] All endpoints tested
- [ ] Government employee rules enforced
- [ ] 90-day freshness validation working
- [ ] DTNI calculations accurate

---

## 🎉 **Production Ready!**

Once all steps are completed, your salary verification system will be:
- ✅ **Fully functional** with live data integration
- ✅ **Production secure** with authentication & rate limiting
- ✅ **Government compliant** with $70 buffer and EC number rules
- ✅ **Performance optimized** with database indexes
- ✅ **Audit ready** with complete logging and flags

**System is now ready for production use!** 🚀

## 📞 **Support**

For deployment issues:
1. Check this guide first
2. Review error logs in console
3. Verify database connections
4. Test with provided curl commands
5. Check environment variables

The system includes comprehensive error handling and fallback mechanisms to ensure reliability in production.
