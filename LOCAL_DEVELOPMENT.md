# 🖥️ ZimCrowd Local Development Guide

## Quick Start

### **Option 1: Double-Click to Start** (Easiest)

1. **Double-click:** `start-local-server.bat`
2. **Open browser to:** `http://localhost:8000/local-server.html`
3. **Done!** Browse all pages locally

### **Option 2: Direct File Access**

1. **Double-click:** `local-server.html`
2. **Choose a page** from the menu
3. **View locally** without server

### **Option 3: View Dashboard Preview**

1. **Double-click:** `dashboard-local.html`
2. **See dashboard UI** with sample data
3. **No authentication** required

---

## 📁 Local Development Files

### **New Files Created:**

| File | Purpose |
|------|---------|
| `local-server.html` | Main menu for local development |
| `dashboard-local.html` | Dashboard preview with sample data |
| `start-local-server.bat` | One-click server startup |
| `LOCAL_DEVELOPMENT.md` | This guide |

---

## 🚀 Starting a Local Server

### **Method 1: Batch File (Windows)**

```bash
# Double-click or run:
start-local-server.bat
```

### **Method 2: Python**

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

### **Method 3: Node.js**

```bash
# Using npx (no install needed)
npx http-server -p 8000

# Or install globally
npm install -g http-server
http-server -p 8000
```

### **Method 4: VS Code Live Server**

1. Install "Live Server" extension
2. Right-click `local-server.html`
3. Select "Open with Live Server"

---

## 🌐 Accessing Pages

### **With Local Server:**

```
http://localhost:8000/local-server.html     - Main menu
http://localhost:8000/dashboard-local.html  - Dashboard preview
http://localhost:8000/index.html            - Home page
http://localhost:8000/login.html            - Login page
http://localhost:8000/signup.html           - Sign up page
```

### **Direct File Access:**

```
file:///C:/Users/YourName/Desktop/Zimcrowd-Web/local-server.html
file:///C:/Users/YourName/Desktop/Zimcrowd-Web/dashboard-local.html
```

---

## ⚠️ Limitations of Local Development

### **Features That Work:**

✅ View all HTML pages  
✅ See UI components and styling  
✅ Test responsive design  
✅ View documentation  
✅ Browse navigation  

### **Features That Don't Work:**

❌ User authentication (requires backend)  
❌ Paynow payments (requires API)  
❌ Database operations (requires Supabase)  
❌ Real wallet transactions  
❌ Live exchange rates  
❌ File uploads  

---

## 🔧 Troubleshooting

### **Problem: "This site can't be reached"**

**Solution:**
- Make sure local server is running
- Check port 8000 is not in use
- Try a different port: `python -m http.server 8080`

### **Problem: "Some features don't work"**

**Solution:**
- Use production site for full features: https://zimcrowd.com
- Local development is for UI testing only

### **Problem: "CORS errors in console"**

**Solution:**
- Use a local server (not file://)
- Or ignore CORS errors for local testing

### **Problem: "Authentication redirects to zimcrowd.com"**

**Solution:**
- Use `dashboard-local.html` for local preview
- Or use production site for authentication

---

## 📊 Local vs Production

| Feature | Local | Production |
|---------|-------|------------|
| **View UI** | ✅ Yes | ✅ Yes |
| **Authentication** | ❌ No | ✅ Yes |
| **Payments** | ❌ No | ✅ Yes |
| **Database** | ❌ No | ✅ Yes |
| **API Calls** | ❌ No | ✅ Yes |
| **File Uploads** | ❌ No | ✅ Yes |
| **Speed** | ⚡ Fast | 🌐 Network |

---

## 🎯 Recommended Workflow

### **For UI Development:**

1. **Start local server:** `start-local-server.bat`
2. **Edit files** in your code editor
3. **Refresh browser** to see changes
4. **Use Live Server** for auto-reload

### **For Testing Features:**

1. **Use production site:** https://zimcrowd.com
2. **Test with real data**
3. **Verify payments work**
4. **Check authentication**

### **For Documentation:**

1. **Open .md files** in editor
2. **Or view in browser** via local server
3. **Use Markdown preview** in VS Code

---

## 📝 Available Pages

### **Public Pages:**

- `index.html` - Home page
- `login.html` - Login
- `signup.html` - Sign up
- `primary-market.html` - Primary market
- `secondary-market.html` - Secondary market
- `kairo-ai.html` - Kairo AI

### **Protected Pages (require login):**

- `dashboard.html` - User dashboard
- `wallet.html` - Wallet management
- `loans.html` - Loan management
- `investments.html` - Investment portfolio

### **Local Development:**

- `local-server.html` - Main menu
- `dashboard-local.html` - Dashboard preview

---

## 🔗 Quick Links

### **Production Site:**
- **Main:** https://zimcrowd.com
- **Dashboard:** https://zimcrowd.com/dashboard.html
- **API:** https://zimcrowd-backend.vercel.app

### **GitLab:**
- **Repository:** https://gitlab.com/jchitewe-group/Zimcrowd-Web
- **Pages:** https://jchitewe-group.gitlab.io/Zimcrowd-Web
- **Pipelines:** https://gitlab.com/jchitewe-group/Zimcrowd-Web/-/pipelines

### **Documentation:**
- `PAYNOW_README.md` - Paynow integration
- `DUAL_CURRENCY_WALLET.md` - Wallet system
- `DEPLOYMENT_CHECKLIST.md` - Deployment guide
- `PAYNOW_MASTER_INDEX.md` - All Paynow docs

---

## 💡 Tips

### **1. Use Browser DevTools**

```
F12 - Open DevTools
Ctrl+Shift+M - Toggle device toolbar (mobile view)
Ctrl+Shift+C - Inspect element
```

### **2. Test Responsive Design**

- Use DevTools device toolbar
- Test on actual mobile devices
- Check different screen sizes

### **3. View Console Logs**

- Open DevTools Console tab
- See JavaScript errors
- Debug API calls (will fail locally)

### **4. Edit and Reload**

- Edit HTML/CSS/JS files
- Save changes
- Refresh browser (F5)
- See updates immediately

---

## 🎨 Customization

### **Change Local Server Port:**

Edit `start-local-server.bat`:

```batch
REM Change 8000 to your preferred port
python -m http.server 8000
```

### **Add More Pages:**

Edit `local-server.html`:

```html
<a href="your-page.html" class="page-card">
    <h3>📄 Your Page</h3>
    <p>Description</p>
</a>
```

---

## ✅ Summary

**For Local Development:**
1. Use `start-local-server.bat` or `local-server.html`
2. View UI and test styling
3. Edit files and refresh browser

**For Full Features:**
1. Use production site: https://zimcrowd.com
2. Test with real authentication
3. Verify payments and API calls

**For Dashboard Preview:**
1. Open `dashboard-local.html`
2. See UI with sample data
3. No backend required

---

## 📞 Support

**Issues with local development?**
- Check this guide first
- Verify Python/Node.js is installed
- Try different browser
- Use production site for full features

**Need help?**
- Check documentation in `/docs`
- View README files
- Contact support team

---

**🎉 Happy Local Development!** 🎉

Your local environment is now set up for UI development and testing!
