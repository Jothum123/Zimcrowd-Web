# Mock Data Service - Implementation Guide

## 🎯 **Overview**

I've created a complete mock data system that provides realistic data in the **exact format** expected by your live API. This allows you to:
- ✅ Test the dashboard without waiting for backend deployment
- ✅ Develop frontend features independently
- ✅ Demo the platform to stakeholders
- ✅ Automatically fallback to mock data if API fails

---

## 📁 **Files Created**

### **1. `js/mock-data.js`** - Mock Data Store
Contains realistic sample data for:
- User profiles
- Wallet balances
- Loans (active, pending, completed)
- Investments
- Transactions
- Statistics
- Notifications
- Loan opportunities

### **2. `js/data-service.js`** - Unified Data Service
Provides a single interface that can:
- Switch between mock data and real API
- Automatically fallback to mock data if API fails
- Handle timeouts and errors gracefully

### **3. `dashboard-demo.html`** - Live Demo
A working demo showing:
- How to use the mock data service
- Toggle between mock and real API
- Display all data types
- Realistic UI components

---

## 🚀 **Quick Start**

### **View the Demo:**

1. Open in browser:
   ```
   http://localhost:8000/dashboard-demo.html
   ```
   or
   ```
   https://zimcrowd.com/dashboard-demo.html
   ```

2. **Toggle between modes:**
   - Click "Use Mock Data" for testing
   - Click "Use Real API" when backend is ready

---

## 💻 **How to Use in Your Dashboard**

### **Step 1: Add Scripts to HTML**

```html
<!-- Add these before your dashboard scripts -->
<script src="js/mock-data.js"></script>
<script src="js/data-service.js"></script>
```

### **Step 2: Initialize the Service**

```javascript
// At the top of your dashboard script
DataService.init({
    useMockData: false,  // Set to true for mock data
    apiBaseUrl: 'https://zimcrowd-backend.vercel.app/api',
    timeout: 10000
});
```

### **Step 3: Use the Service**

Replace your current API calls with DataService calls:

#### **Before (Direct API):**
```javascript
const response = await fetch('https://zimcrowd-backend.vercel.app/api/wallet', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
```

#### **After (DataService):**
```javascript
const data = await DataService.getWallet();
// Automatically uses mock data or real API based on configuration
// Falls back to mock data if API fails
```

---

## 📊 **Available Methods**

### **User & Wallet:**
```javascript
// Get user profile
const profile = await DataService.getProfile();

// Get wallet balance
const wallet = await DataService.getWallet();

// Get statistics
const stats = await DataService.getStatistics();
```

### **Loans:**
```javascript
// Get user's loans (paginated)
const loans = await DataService.getLoans(page = 1, limit = 10);

// Get loan opportunities for investors
const opportunities = await DataService.getLoanOpportunities(page = 1, limit = 10);
```

### **Investments:**
```javascript
// Get user's investments (paginated)
const investments = await DataService.getInvestments(page = 1, limit = 10);
```

### **Transactions:**
```javascript
// Get user's transactions (paginated)
const transactions = await DataService.getTransactions(page = 1, limit = 10);
```

### **Notifications:**
```javascript
// Get all notifications
const notifications = await DataService.getNotifications();

// Get unread only
const unread = await DataService.getNotifications(true);
```

---

## 🔧 **Configuration Options**

### **Enable Mock Data:**
```javascript
DataService.enableMockData();
// All calls now use mock data
```

### **Enable Real API:**
```javascript
DataService.disableMockData();
// All calls now use real API (with fallback to mock)
```

### **Check Current Mode:**
```javascript
console.log(DataService.config.useMockData);
// true = mock mode, false = API mode
```

---

## 📋 **Mock Data Structure**

### **Wallet Response:**
```json
{
  "success": true,
  "data": {
    "balance": 15750.50,
    "currency": "USD",
    "available_balance": 14250.50,
    "pending_balance": 1500.00,
    "total_invested": 25000.00,
    "total_borrowed": 10000.00,
    "total_earned": 3250.75
  }
}
```

### **Loans Response:**
```json
{
  "success": true,
  "data": {
    "loans": [
      {
        "id": "loan_001",
        "amount": 5000.00,
        "currency": "USD",
        "interest_rate": 12.5,
        "term_months": 12,
        "purpose": "Business Expansion",
        "status": "active",
        "funded_amount": 5000.00,
        "repaid_amount": 1250.00,
        "remaining_amount": 3750.00,
        "next_payment_date": "2025-12-15",
        "next_payment_amount": 458.33,
        "risk_rating": "B+",
        "monthly_payment": 458.33,
        "payments_made": 3,
        "payments_remaining": 9
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### **Investments Response:**
```json
{
  "success": true,
  "data": {
    "investments": [
      {
        "id": "inv_001",
        "amount": 1000.00,
        "currency": "USD",
        "interest_rate": 12.0,
        "status": "active",
        "earned_interest": 120.00,
        "expected_return": 1120.00,
        "borrower_name": "Sarah Moyo",
        "loan_purpose": "Agriculture",
        "risk_rating": "B",
        "term_months": 12,
        "payments_received": 4,
        "next_payment_date": "2025-01-01",
        "next_payment_amount": 93.33
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### **Transactions Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_001",
        "type": "investment",
        "amount": 1000.00,
        "currency": "USD",
        "status": "completed",
        "description": "Investment in Loan #loan_external_001",
        "created_at": "2024-11-13T14:30:00Z",
        "reference": "INV-20241113-001",
        "balance_after": 14250.50
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

## 🎨 **Integration Example**

Here's a complete example of loading dashboard data:

```javascript
async function loadDashboard() {
    try {
        // Initialize service (do this once on page load)
        DataService.init({ 
            useMockData: false  // Change to true for testing
        });

        // Load wallet
        const walletData = await DataService.getWallet();
        if (walletData.success) {
            updateWalletUI(walletData.data);
        }

        // Load loans
        const loansData = await DataService.getLoans(1, 5);
        if (loansData.success) {
            updateLoansUI(loansData.data.loans);
        }

        // Load investments
        const investmentsData = await DataService.getInvestments(1, 5);
        if (investmentsData.success) {
            updateInvestmentsUI(investmentsData.data.investments);
        }

        // Load transactions
        const transactionsData = await DataService.getTransactions(1, 10);
        if (transactionsData.success) {
            updateTransactionsUI(transactionsData.data.transactions);
        }

        // Load statistics
        const statsData = await DataService.getStatistics();
        if (statsData.success) {
            updateStatsUI(statsData.data);
        }

    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Service automatically falls back to mock data on error
    }
}

function updateWalletUI(wallet) {
    document.getElementById('balance').textContent = 
        `$${wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('invested').textContent = 
        `$${wallet.total_invested.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('earned').textContent = 
        `$${wallet.total_earned.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function updateLoansUI(loans) {
    const container = document.getElementById('loans-container');
    container.innerHTML = loans.map(loan => `
        <div class="loan-card">
            <h3>${loan.purpose}</h3>
            <p class="amount">$${loan.amount.toLocaleString()}</p>
            <p class="status">${loan.status}</p>
            <div class="details">
                <span>${loan.interest_rate}% APR</span>
                <span>${loan.term_months} months</span>
                <span>Rating: ${loan.risk_rating}</span>
            </div>
        </div>
    `).join('');
}
```

---

## 🔄 **Automatic Fallback**

The DataService automatically falls back to mock data if:
- ❌ API request times out (>10 seconds)
- ❌ Network error occurs
- ❌ API returns an error
- ❌ Backend is not deployed yet

This ensures your dashboard **always works**, even during development or backend issues.

---

## 🧪 **Testing Scenarios**

### **Scenario 1: Development Mode**
```javascript
DataService.init({ useMockData: true });
// All data comes from mock-data.js
// Perfect for frontend development
```

### **Scenario 2: Production with Fallback**
```javascript
DataService.init({ useMockData: false });
// Tries real API first
// Falls back to mock data if API fails
// Best for production
```

### **Scenario 3: Demo Mode**
```javascript
DataService.enableMockData();
// Switch to mock data on the fly
// Great for demos and presentations
```

---

## 📈 **Benefits**

### **For Development:**
- ✅ Work on frontend without waiting for backend
- ✅ Test UI with realistic data
- ✅ No API rate limits or costs
- ✅ Instant responses (no network delay)

### **For Production:**
- ✅ Graceful degradation if API fails
- ✅ Better user experience
- ✅ Easier debugging
- ✅ Demo mode for presentations

### **For Testing:**
- ✅ Consistent test data
- ✅ No database dependencies
- ✅ Faster test execution
- ✅ Predictable results

---

## 🎯 **Next Steps**

### **1. Test the Demo:**
```bash
# Open in browser
http://localhost:8000/dashboard-demo.html
```

### **2. Integrate into Dashboard:**
```html
<!-- Add to dashboard.html -->
<script src="js/mock-data.js"></script>
<script src="js/data-service.js"></script>
```

### **3. Replace API Calls:**
```javascript
// Replace direct fetch() calls with DataService methods
const data = await DataService.getLoans();
```

### **4. Configure Mode:**
```javascript
// Set based on environment
const isDevelopment = window.location.hostname === 'localhost';
DataService.init({ useMockData: isDevelopment });
```

---

## 📝 **Customizing Mock Data**

To add or modify mock data, edit `js/mock-data.js`:

```javascript
// Add a new loan
MockDataService.loans.push({
    id: 'loan_004',
    amount: 7500.00,
    purpose: 'Your Purpose',
    // ... other fields
});

// Modify wallet balance
MockDataService.wallet.balance = 20000.00;

// Add a new transaction
MockDataService.transactions.unshift({
    id: 'txn_new',
    type: 'deposit',
    amount: 5000.00,
    // ... other fields
});
```

---

## 🚀 **Ready to Use!**

The mock data service is now ready to use:
- ✅ Realistic data in correct API format
- ✅ Easy toggle between mock and real API
- ✅ Automatic fallback on errors
- ✅ Working demo page
- ✅ Complete documentation

**Open `dashboard-demo.html` to see it in action!** 🎉
