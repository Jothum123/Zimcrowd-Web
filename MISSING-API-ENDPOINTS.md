# Missing API Endpoints - Backend Implementation Required

## 📋 Overview

Based on production logs, these API endpoints are being called by the frontend but are returning 404 errors. They need to be implemented in the backend.

**Date:** November 28, 2025  
**Source:** Production logs from Render deployment

---

## ❌ Missing Endpoints

### **1. Settings Endpoints**

#### **GET /api/settings/profile**
```
Status: 404 - Route not found
Called by: SettingsProductionLoader
Purpose: Load user profile settings
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+263771234567",
    "date_of_birth": "1990-01-15",
    "address": "123 Main St, Harare",
    "id_number": "12-345678-A-12",
    "profile_picture": "https://...",
    "bio": "Investor and entrepreneur"
  }
}
```

---

#### **GET /api/settings/display**
```
Status: 404 - Route not found
Called by: SettingsProductionLoader
Purpose: Load display preferences
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "theme": "dark",
    "language": "en",
    "currency": "USD",
    "timezone": "Africa/Harare",
    "date_format": "DD/MM/YYYY",
    "number_format": "1,234.56"
  }
}
```

---

#### **GET /api/settings/privacy**
```
Status: 404 - Route not found
Called by: SettingsProductionLoader
Purpose: Load privacy settings
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "profile_visibility": "private",
    "show_portfolio": false,
    "show_activity": false,
    "allow_messages": true,
    "allow_cookies": true,
    "share_data": false,
    "third_party_analytics": false
  }
}
```

---

#### **GET /api/settings/investment-preferences**
```
Status: 404 - Route not found
Called by: SettingsProductionLoader
Purpose: Load investment preferences
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "risk_tolerance": "moderate",
    "preferred_loan_types": ["personal", "business"],
    "min_investment": 100,
    "max_investment": 10000,
    "auto_invest": false,
    "auto_invest_amount": 0,
    "diversification_enabled": true,
    "max_per_loan": 1000
  }
}
```

---

#### **GET /api/settings/notifications**
```
Status: Not in logs but required
Called by: SettingsProductionLoader
Purpose: Load notification preferences
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "email_notifications": {
      "loan_approved": true,
      "payment_received": true,
      "payment_due": true,
      "weekly_summary": true,
      "monthly_report": true
    },
    "push_notifications": {
      "loan_updates": true,
      "investment_updates": true,
      "payment_reminders": true,
      "security_alerts": true
    },
    "sms_notifications": {
      "payment_received": false,
      "payment_due": false,
      "security_alerts": true
    }
  }
}
```

---

### **2. P2P Market Endpoints**

#### **GET /api/p2p-primary-market/available-loans**
```
Status: 404 - Route not found
Called by: Dashboard overview
Purpose: Get available loans for investment
Query params: ?page=1&limit=6
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "loans": [
      {
        "id": "loan_123",
        "borrower_name": "John Doe",
        "amount": 5000,
        "funded_amount": 2500,
        "funding_percentage": 50,
        "interest_rate": 8.5,
        "term_months": 12,
        "purpose": "Business expansion",
        "risk_score": "B",
        "time_remaining": "5 days",
        "min_investment": 100
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 6,
      "total": 45,
      "total_pages": 8
    }
  }
}
```

---

#### **GET /api/p2p-secondary-market/listings**
```
Status: 404 - Route not found
Called by: Dashboard overview
Purpose: Get secondary market listings
Query params: ?page=1&limit=6
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "listing_456",
        "loan_id": "loan_789",
        "seller_id": "user_123",
        "original_amount": 1000,
        "remaining_amount": 750,
        "asking_price": 720,
        "discount": 4,
        "interest_rate": 9.0,
        "remaining_term": 8,
        "risk_score": "A",
        "listed_date": "2025-11-20"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 6,
      "total": 23,
      "total_pages": 4
    }
  }
}
```

---

### **3. Database Issues**

#### **Missing Table: user_statistics**
```
Error: Could not find the table 'public.user_statistics' in the schema cache
Hint: Perhaps you meant the table 'public.user_settings'
```

**Required Table Schema:**
```sql
CREATE TABLE public.user_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Investment stats
    total_invested DECIMAL(15, 2) DEFAULT 0,
    total_returns DECIMAL(15, 2) DEFAULT 0,
    active_investments INTEGER DEFAULT 0,
    completed_investments INTEGER DEFAULT 0,
    
    -- Loan stats (for borrowers)
    total_borrowed DECIMAL(15, 2) DEFAULT 0,
    total_repaid DECIMAL(15, 2) DEFAULT 0,
    active_loans INTEGER DEFAULT 0,
    completed_loans INTEGER DEFAULT 0,
    
    -- Performance metrics
    average_roi DECIMAL(5, 2) DEFAULT 0,
    on_time_payment_rate DECIMAL(5, 2) DEFAULT 0,
    default_rate DECIMAL(5, 2) DEFAULT 0,
    
    -- Activity
    last_investment_date TIMESTAMP,
    last_loan_date TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX idx_user_statistics_user_id ON public.user_statistics(user_id);

-- Function to update statistics
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update statistics when investments or loans change
    -- Implementation depends on your business logic
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Priority Levels

### **🔴 Critical (Blocking User Experience)**

1. **GET /api/settings/profile** - Users can't view/edit profile
2. **GET /api/settings/notifications** - Users can't manage notifications
3. **user_statistics table** - Dashboard stats not working

### **🟡 High Priority (Feature Incomplete)**

4. **GET /api/settings/display** - Display preferences not working
5. **GET /api/settings/privacy** - Privacy settings not working
6. **GET /api/settings/investment-preferences** - Investment prefs not working

### **🟢 Medium Priority (Nice to Have)**

7. **GET /api/p2p-primary-market/available-loans** - Primary market not showing
8. **GET /api/p2p-secondary-market/listings** - Secondary market not showing

---

## 🔧 Implementation Guide

### **1. Settings Endpoints**

**File:** `backend/routes/settings.js` (or similar)

```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// GET /api/settings/profile
router.get('/profile', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', req.user.id)
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/settings/display
router.get('/display', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_settings')
            .select('theme, language, currency, timezone, date_format, number_format')
            .eq('user_id', req.user.id)
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/settings/privacy
router.get('/privacy', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_settings')
            .select('profile_visibility, show_portfolio, show_activity, allow_messages, allow_cookies, share_data, third_party_analytics')
            .eq('user_id', req.user.id)
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/settings/investment-preferences
router.get('/investment-preferences', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('investment_preferences')
            .select('*')
            .eq('user_id', req.user.id)
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/settings/notifications
router.get('/notifications', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', req.user.id)
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
```

---

### **2. P2P Market Endpoints**

**File:** `backend/routes/p2p-market.js`

```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// GET /api/p2p-primary-market/available-loans
router.get('/available-loans', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 6 } = req.query;
        const offset = (page - 1) * limit;
        
        const { data: loans, error, count } = await supabase
            .from('loans')
            .select('*, borrower:user_profiles!borrower_id(*)', { count: 'exact' })
            .eq('status', 'funding')
            .lt('funded_amount', 'amount')
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            success: true,
            data: {
                loans: loans.map(loan => ({
                    ...loan,
                    funding_percentage: (loan.funded_amount / loan.amount) * 100
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    total_pages: Math.ceil(count / limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/p2p-secondary-market/listings
router.get('/listings', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 6 } = req.query;
        const offset = (page - 1) * limit;
        
        const { data: listings, error, count } = await supabase
            .from('secondary_market_listings')
            .select('*, loan:loans(*)', { count: 'exact' })
            .eq('status', 'active')
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            success: true,
            data: {
                listings,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    total_pages: Math.ceil(count / limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
```

---

### **3. Register Routes in Main App**

**File:** `backend/server.js` or `backend/app.js`

```javascript
const settingsRoutes = require('./routes/settings');
const p2pPrimaryMarketRoutes = require('./routes/p2p-primary-market');
const p2pSecondaryMarketRoutes = require('./routes/p2p-secondary-market');

app.use('/api/settings', settingsRoutes);
app.use('/api/p2p-primary-market', p2pPrimaryMarketRoutes);
app.use('/api/p2p-secondary-market', p2pSecondaryMarketRoutes);
```

---

## ✅ Testing Checklist

### **Settings Endpoints:**
- [ ] GET /api/settings/profile returns user profile
- [ ] GET /api/settings/display returns display preferences
- [ ] GET /api/settings/privacy returns privacy settings
- [ ] GET /api/settings/investment-preferences returns investment prefs
- [ ] GET /api/settings/notifications returns notification prefs
- [ ] All endpoints require authentication
- [ ] All endpoints return proper error messages

### **P2P Market Endpoints:**
- [ ] GET /api/p2p-primary-market/available-loans returns loans
- [ ] GET /api/p2p-secondary-market/listings returns listings
- [ ] Pagination works correctly
- [ ] Filtering works (if implemented)
- [ ] Authentication required

### **Database:**
- [ ] user_statistics table created
- [ ] Indexes created for performance
- [ ] Triggers/functions working
- [ ] Initial data populated

---

## 📝 Summary

**Total Missing Endpoints:** 7
- Settings: 5 endpoints
- P2P Markets: 2 endpoints
- Database: 1 table

**Impact:**
- Settings page not functional
- P2P markets not showing
- Dashboard statistics broken

**Action Required:**
1. Create missing database table (`user_statistics`)
2. Implement 7 API endpoints
3. Test all endpoints
4. Deploy to production

---

**Document Version:** 1.0  
**Last Updated:** November 28, 2025  
**Status:** Awaiting Backend Implementation  
**Priority:** 🔴 Critical
