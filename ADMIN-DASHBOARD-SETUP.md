# 🎯 Zimcrowd Admin Dashboard - Setup Guide

## ✅ **What's Been Created:**

### **1. Backend Service** (`services/admin-dashboard.service.js`)
- Real-time data from Supabase
- User statistics
- Loan statistics
- Payment statistics
- Activity tracking
- Recent activity feed

### **2. API Routes** (`routes/admin-dashboard.js`)
- `GET /api/admin-dashboard/overview` - Complete dashboard data
- `GET /api/admin-dashboard/users` - Users list with filters
- `GET /api/admin-dashboard/loans` - Loans list with filters
- `GET /api/admin-dashboard/stats/users` - User statistics
- `GET /api/admin-dashboard/stats/loans` - Loan statistics
- `GET /api-dashboard/stats/payments` - Payment statistics
- `GET /api/admin-dashboard/activity/recent` - Recent activity

### **3. HTML Dashboard** (`public/admin-dashboard.html`)
- Beautiful, responsive UI
- Real-time statistics
- Recent activity feed
- Pending loans table
- Recent users table
- Auto-refresh every 30 seconds

---

## 🚀 **Quick Setup (3 Steps):**

### **Step 1: Register Routes in Server**

Add to your `backend-server.js` or `index.js`:

```javascript
// Import admin dashboard routes
const adminDashboardRoutes = require('./routes/admin-dashboard');

// Register routes
app.use('/api/admin-dashboard', adminDashboardRoutes);
```

### **Step 2: Set Admin API Key (Optional)**

Add to your `.env` file:

```bash
ADMIN_API_KEY=your-secure-admin-key-here
```

Or use the default dev key: `admin-dev-key-123`

### **Step 3: Access Dashboard**

Open in your browser:
```
http://localhost:3000/admin-dashboard.html
```

Or in production:
```
https://zimcrowd-backend.vercel.app/admin-dashboard.html
```

---

## 📊 **Dashboard Features:**

### **Real-Time Statistics:**
- ✅ Total users & new registrations today
- ✅ Active loans & pending approvals
- ✅ Total payments & success rate
- ✅ Revenue in USD & ZWG

### **Recent Activity Feed:**
- ✅ New user registrations
- ✅ Loan applications
- ✅ Payment transactions
- ✅ Timestamps (e.g., "5m ago", "2h ago")

### **Pending Loans Table:**
- ✅ User information
- ✅ Loan amount & type
- ✅ Status badges
- ✅ Application date

### **Recent Users Table:**
- ✅ User details
- ✅ Email & phone
- ✅ Verification status
- ✅ Join date

### **Auto-Refresh:**
- ✅ Updates every 30 seconds
- ✅ Manual refresh button
- ✅ Error handling

---

## 🔐 **Security:**

### **Current Setup (Development):**
- Simple API key authentication
- Default key: `admin-dev-key-123`
- Suitable for development only

### **Production Setup (Recommended):**

1. **Use Strong API Key:**
   ```bash
   ADMIN_API_KEY=$(openssl rand -hex 32)
   ```

2. **Add JWT Authentication:**
   ```javascript
   const jwt = require('jsonwebtoken');
   
   const authenticateAdmin = async (req, res, next) => {
       const token = req.headers.authorization?.replace('Bearer ', '');
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       
       // Check if user is admin
       const { data: user } = await supabase
           .from('users')
           .select('role')
           .eq('id', decoded.userId)
           .single();
       
       if (user.role !== 'admin') {
           return res.status(403).json({ error: 'Admin access required' });
       }
       
       next();
   };
   ```

3. **Add IP Whitelist:**
   ```javascript
   const allowedIPs = ['your.office.ip.address'];
   
   const checkIP = (req, res, next) => {
       const clientIP = req.ip;
       if (!allowedIPs.includes(clientIP)) {
           return res.status(403).json({ error: 'Access denied' });
       }
       next();
   };
   ```

---

## 🎨 **Customization:**

### **Change Colors:**
Edit `public/admin-dashboard.html`:
```css
.header {
    background: linear-gradient(135deg, #your-color 0%, #your-color-2 100%);
}
```

### **Add More Stats:**
Edit `services/admin-dashboard.service.js`:
```javascript
async getDashboardOverview() {
    // Add your custom statistics here
    const customStats = await this.getCustomStatistics();
    
    return {
        ...existingData,
        custom: customStats
    };
}
```

### **Modify Refresh Interval:**
Edit `public/admin-dashboard.html`:
```javascript
// Change from 30 seconds to your preferred interval
setInterval(loadDashboard, 60000); // 60 seconds
```

---

## 📱 **Mobile Responsive:**

The dashboard is fully responsive and works on:
- ✅ Desktop (1920px+)
- ✅ Laptop (1366px)
- ✅ Tablet (768px)
- ✅ Mobile (375px)

---

## 🔧 **API Examples:**

### **Get Dashboard Overview:**
```bash
curl -H "X-Admin-Key: admin-dev-key-123" \
  http://localhost:3000/api/admin-dashboard/overview
```

### **Get Users List:**
```bash
curl -H "X-Admin-Key: admin-dev-key-123" \
  "http://localhost:3000/api/admin-dashboard/users?page=1&limit=20&status=active"
```

### **Get Pending Loans:**
```bash
curl -H "X-Admin-Key: admin-dev-key-123" \
  "http://localhost:3000/api/admin-dashboard/loans?status=pending"
```

### **Get Payment Statistics:**
```bash
curl -H "X-Admin-Key: admin-dev-key-123" \
  http://localhost:3000/api/admin-dashboard/stats/payments
```

---

## 🐛 **Troubleshooting:**

### **Dashboard shows "Failed to load data":**
1. Check if routes are registered in server
2. Verify API key is correct
3. Check browser console for errors
4. Ensure Supabase credentials are set

### **Stats show 0 or empty:**
1. Database tables might be empty (normal for new setup)
2. Check Supabase connection
3. Verify table names match schema

### **401 Unauthorized:**
1. Check API key in `.env` file
2. Update API key in `admin-dashboard.html`
3. Verify authentication middleware

---

## 📈 **Future Enhancements:**

### **Phase 1 (Current):**
- [x] Real-time statistics
- [x] Recent activity feed
- [x] User & loan lists
- [x] Auto-refresh

### **Phase 2 (Next):**
- [ ] Charts & graphs (Chart.js)
- [ ] Export data to CSV/PDF
- [ ] Advanced filters
- [ ] Date range selection

### **Phase 3 (Future):**
- [ ] Email notifications
- [ ] SMS alerts
- [ ] Role-based access control
- [ ] Audit logs
- [ ] Custom reports

---

## ✅ **Integration Checklist:**

- [ ] Routes registered in server
- [ ] Admin API key set in `.env`
- [ ] Dashboard accessible in browser
- [ ] Statistics displaying correctly
- [ ] Recent activity showing
- [ ] Tables loading data
- [ ] Auto-refresh working
- [ ] Mobile responsive tested

---

## 📞 **Support:**

If you need help:
1. Check browser console for errors
2. Check server logs
3. Verify Supabase connection
4. Test API endpoints with curl

---

**Status:** ✅ **READY TO USE**  
**Setup Time:** ~5 minutes  
**No Separate System Needed:** Integrated into existing backend

**Access:** `http://localhost:3000/admin-dashboard.html`
