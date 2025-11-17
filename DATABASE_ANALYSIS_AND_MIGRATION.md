# 🗃️ Database Analysis & ZimScore Migration Plan

## 📊 **Current Database Status**

### **Existing Tables:**
- ✅ `users` - Exists (missing employment_type column)
- ✅ `employment_details` - Exists (structure unknown, requires UUID user_id)
- ✅ `loans` - Exists (empty, structure unknown)
- ✅ `zimscore_history` - Exists (empty)
- ✅ `verification_documents` - Exists
- ✅ `loan_installments` - Exists
- ❌ `user_zimscores` - **MISSING** (main ZimScore table)

---

## 🎯 **Required Changes for DTNI Implementation**

### **1. CREATE Missing Tables:**

#### **A. user_zimscores Table (CRITICAL)**
```sql
CREATE TABLE user_zimscores (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Score values
    score_value INTEGER NOT NULL CHECK (score_value BETWEEN 30 AND 85),
    star_rating DECIMAL(2,1) NOT NULL CHECK (star_rating BETWEEN 1.0 AND 5.0),
    max_loan_amount DECIMAL(10,2) NOT NULL,
    score_based_limit DECIMAL(10,2) NOT NULL,
    risk_level TEXT NOT NULL,
    
    -- Component breakdown
    component1_banking INTEGER DEFAULT 0,
    component2_employment INTEGER DEFAULT 0, 
    component3_performance INTEGER DEFAULT 0,
    
    -- Banking factors
    cash_flow_ratio DECIMAL(5,2),
    avg_balance DECIMAL(10,2),
    balance_consistency INTEGER,
    nsf_events INTEGER DEFAULT 0,
    account_age_months INTEGER DEFAULT 0,
    additional_accounts INTEGER DEFAULT 0,
    
    -- Employment
    employment_type TEXT,
    
    -- DTNI (NEW - CRITICAL FOR OUR IMPLEMENTATION)
    dtni_ratio DECIMAL(5,4),
    dtni_status TEXT,
    
    -- Performance metrics
    total_loans INTEGER DEFAULT 0,
    on_time_payments INTEGER DEFAULT 0,
    late_payments INTEGER DEFAULT 0,
    defaults INTEGER DEFAULT 0,
    max_loan_repaid DECIMAL(10,2) DEFAULT 0,
    platform_tenure_months INTEGER DEFAULT 0,
    
    -- Metadata
    score_factors JSONB,
    calculation_method TEXT,
    cold_start_active BOOLEAN DEFAULT TRUE,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **2. ALTER Existing Tables:**

#### **A. Add employment_type to users table**
```sql
ALTER TABLE users ADD COLUMN employment_type TEXT;
COMMENT ON COLUMN users.employment_type IS 'Employment type: government, private, business, informal';
```

#### **B. Update employment_details table (if needed)**
```sql
-- Check if these columns exist, add if missing:
ALTER TABLE employment_details ADD COLUMN IF NOT EXISTS employment_type TEXT;
ALTER TABLE employment_details ADD COLUMN IF NOT EXISTS monthly_income DECIMAL(10,2);
```

#### **C. Update loans table for DTNI**
```sql
-- Add DTNI-related columns to loans table
ALTER TABLE loans ADD COLUMN IF NOT EXISTS term_days INTEGER;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS monthly_installment DECIMAL(10,2);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS dtni_validation JSONB;
```

### **3. UPDATE zimscore_history table (if needed)**
```sql
-- Ensure zimscore_history has all required columns
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT uuid_generate_v4();
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS old_score_value INTEGER;
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS new_score_value INTEGER;
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS score_change INTEGER;
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS old_max_loan_amount DECIMAL(10,2);
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS new_max_loan_amount DECIMAL(10,2);
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS change_reason TEXT;
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS change_details JSONB;
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

---

## 🔧 **Migration Script**

### **Step 1: Create user_zimscores table**
```sql
-- Create the main ZimScore table
CREATE TABLE IF NOT EXISTS user_zimscores (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    score_value INTEGER NOT NULL CHECK (score_value BETWEEN 30 AND 85),
    star_rating DECIMAL(2,1) NOT NULL CHECK (star_rating BETWEEN 1.0 AND 5.0),
    max_loan_amount DECIMAL(10,2) NOT NULL,
    score_based_limit DECIMAL(10,2) NOT NULL,
    risk_level TEXT NOT NULL,
    component1_banking INTEGER DEFAULT 0,
    component2_employment INTEGER DEFAULT 0,
    component3_performance INTEGER DEFAULT 0,
    cash_flow_ratio DECIMAL(5,2),
    avg_balance DECIMAL(10,2),
    balance_consistency INTEGER,
    nsf_events INTEGER DEFAULT 0,
    account_age_months INTEGER DEFAULT 0,
    additional_accounts INTEGER DEFAULT 0,
    employment_type TEXT,
    dtni_ratio DECIMAL(5,4),
    dtni_status TEXT,
    total_loans INTEGER DEFAULT 0,
    on_time_payments INTEGER DEFAULT 0,
    late_payments INTEGER DEFAULT 0,
    defaults INTEGER DEFAULT 0,
    max_loan_repaid DECIMAL(10,2) DEFAULT 0,
    platform_tenure_months INTEGER DEFAULT 0,
    score_factors JSONB,
    calculation_method TEXT,
    cold_start_active BOOLEAN DEFAULT TRUE,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_zimscores_user_id ON user_zimscores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_zimscores_score_value ON user_zimscores(score_value);
CREATE INDEX IF NOT EXISTS idx_user_zimscores_risk_level ON user_zimscores(risk_level);
CREATE INDEX IF NOT EXISTS idx_user_zimscores_employment_type ON user_zimscores(employment_type);
CREATE INDEX IF NOT EXISTS idx_user_zimscores_cold_start ON user_zimscores(cold_start_active);
```

### **Step 2: Add missing columns to existing tables**
```sql
-- Add employment_type to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_type TEXT;

-- Ensure employment_details has required columns
ALTER TABLE employment_details ADD COLUMN IF NOT EXISTS employment_type TEXT;
ALTER TABLE employment_details ADD COLUMN IF NOT EXISTS monthly_income DECIMAL(10,2);

-- Add DTNI columns to loans table
ALTER TABLE loans ADD COLUMN IF NOT EXISTS term_days INTEGER;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS monthly_installment DECIMAL(10,2);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS dtni_validation JSONB;
```

### **Step 3: Set up Row Level Security (RLS)**
```sql
-- Enable RLS on ZimScore tables
ALTER TABLE user_zimscores ENABLE ROW LEVEL SECURITY;
ALTER TABLE zimscore_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own zimscore" ON user_zimscores
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own score history" ON zimscore_history
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service can manage all zimscores" ON user_zimscores
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service can manage all score history" ON zimscore_history
    FOR ALL
    USING (auth.role() = 'service_role');
```

### **Step 4: Add comments for documentation**
```sql
-- Add table comments
COMMENT ON TABLE user_zimscores IS 'Stores current ZimScore for each user (30-85 range)';
COMMENT ON TABLE zimscore_history IS 'Tracks all ZimScore changes over time';

-- Add column comments
COMMENT ON COLUMN user_zimscores.score_value IS 'Internal score: 30-85 points';
COMMENT ON COLUMN user_zimscores.star_rating IS 'Public rating: 1.0-5.0 stars';
COMMENT ON COLUMN user_zimscores.max_loan_amount IS 'Current borrowing limit (DTNI-based: civil servants $60-$300, others $60-$100)';
COMMENT ON COLUMN user_zimscores.dtni_ratio IS 'Debt-to-Net-Income ratio (0.0-1.0, e.g., 0.25 = 25%)';
COMMENT ON COLUMN user_zimscores.dtni_status IS 'DTNI status: Excellent (≤20%), Good (≤30%), Fair (≤40%), Limited, or Denied';
COMMENT ON COLUMN user_zimscores.cold_start_active IS 'TRUE = DTNI-based limit, FALSE = score-based limit active';
```

---

## 📋 **Migration Checklist**

### **Pre-Migration:**
- [ ] Backup current database
- [ ] Test migration script on development environment
- [ ] Verify Supabase service role permissions

### **Migration Steps:**
1. [ ] Create `user_zimscores` table
2. [ ] Add `employment_type` column to `users` table
3. [ ] Update `employment_details` table structure
4. [ ] Update `loans` table for DTNI support
5. [ ] Update `zimscore_history` table structure
6. [ ] Create indexes for performance
7. [ ] Set up Row Level Security policies
8. [ ] Add table and column comments

### **Post-Migration:**
- [ ] Test ZimScore API endpoints
- [ ] Verify DTNI calculations work
- [ ] Test employment type validation
- [ ] Verify loan application flow
- [ ] Check database performance

---

## 🚨 **Critical Missing Components**

### **1. PRIMARY MISSING: user_zimscores table**
- **Impact:** ZimScore system cannot function
- **Priority:** CRITICAL - Must create immediately
- **Contains:** All ZimScore data, DTNI ratios, employment bonuses

### **2. MISSING: employment_type in users table**
- **Impact:** Employment validation fails
- **Priority:** HIGH - Required for DTNI calculations
- **Used by:** All loan validation logic

### **3. MISSING: DTNI columns in existing tables**
- **Impact:** Cannot store DTNI validation results
- **Priority:** HIGH - Required for our implementation
- **Affects:** Loan applications, ZimScore calculations

---

## 🎯 **Immediate Action Required**

### **Run This Migration Script:**
```sql
-- 1. Create user_zimscores table (CRITICAL)
CREATE TABLE user_zimscores (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    score_value INTEGER NOT NULL CHECK (score_value BETWEEN 30 AND 85),
    star_rating DECIMAL(2,1) NOT NULL CHECK (star_rating BETWEEN 1.0 AND 5.0),
    max_loan_amount DECIMAL(10,2) NOT NULL,
    score_based_limit DECIMAL(10,2) NOT NULL,
    risk_level TEXT NOT NULL,
    employment_type TEXT,
    dtni_ratio DECIMAL(5,4),
    dtni_status TEXT,
    score_factors JSONB,
    calculation_method TEXT,
    cold_start_active BOOLEAN DEFAULT TRUE,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add employment_type to users (CRITICAL)
ALTER TABLE users ADD COLUMN employment_type TEXT;

-- 3. Add DTNI support to loans
ALTER TABLE loans ADD COLUMN term_days INTEGER;
ALTER TABLE loans ADD COLUMN monthly_installment DECIMAL(10,2);
ALTER TABLE loans ADD COLUMN dtni_validation JSONB;

-- 4. Create indexes
CREATE INDEX idx_user_zimscores_user_id ON user_zimscores(user_id);
CREATE INDEX idx_user_zimscores_employment_type ON user_zimscores(employment_type);
```

---

## ✅ **After Migration**

Your database will support:
- ✅ Complete ZimScore calculations
- ✅ DTNI-based cold start limits
- ✅ Employment type validation
- ✅ Reducing balance loan calculations
- ✅ Progressive borrowing limits
- ✅ Loan history tracking

**Status: Ready for production ZimScore implementation! 🚀**
