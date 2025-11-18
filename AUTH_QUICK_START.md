# 🚀 Authentication Quick Start Guide

## Get Your Login & Signup Working in 5 Minutes!

---

## ✅ **WHAT'S BEEN CREATED**

### **1. Production-Ready Files**
- ✅ `utils/auth-service.js` - Core authentication logic
- ✅ `routes/auth-production.js` - API endpoints
- ✅ `middleware/auth-middleware.js` - Route protection
- ✅ `AUTH_API_DOCUMENTATION.md` - Complete API docs

### **2. Features Included**
- ✅ User registration (signup)
- ✅ User login
- ✅ User logout
- ✅ Password reset
- ✅ Token verification
- ✅ Get current user
- ✅ Rate limiting
- ✅ Input validation
- ✅ Bcrypt password hashing
- ✅ JWT token generation
- ✅ Supabase Auth integration

---

## 🎯 **STEP 1: Restart Your Server**

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm start
```

You should see:
```
✅ Loading route: Authentication (Production)
```

---

## 🎯 **STEP 2: Test Signup**

### **Using Postman/Thunder Client:**

**POST** `http://localhost:3001/api/auth/signup`

**Body (JSON):**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123",
  "fullName": "John Doe",
  "phone": "+263771234567"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "uuid-here",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "phone": "+263771234567"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🎯 **STEP 3: Test Login**

**POST** `http://localhost:3001/api/auth/login`

**Body (JSON):**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid-here",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "walletBalance": 0
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🎯 **STEP 4: Test Protected Route**

**GET** `http://localhost:3001/api/auth/me`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_FROM_LOGIN
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "walletBalance": 0
  }
}
```

---

## 💻 **FRONTEND INTEGRATION**

### **HTML Login Form**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Login - ZimCrowd</title>
</head>
<body>
    <h1>Login</h1>
    <form id="loginForm">
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="password" placeholder="Password" required>
        <button type="submit">Login</button>
    </form>
    <p id="message"></p>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('http://localhost:3001/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Store token
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Redirect to dashboard
                    window.location.href = '/dashboard.html';
                } else {
                    document.getElementById('message').textContent = data.message;
                }
            } catch (error) {
                document.getElementById('message').textContent = 'Login failed. Please try again.';
            }
        });
    </script>
</body>
</html>
```

### **HTML Signup Form**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Signup - ZimCrowd</title>
</head>
<body>
    <h1>Create Account</h1>
    <form id="signupForm">
        <input type="text" id="fullName" placeholder="Full Name" required>
        <input type="email" id="email" placeholder="Email" required>
        <input type="tel" id="phone" placeholder="Phone (optional)">
        <input type="password" id="password" placeholder="Password" required>
        <button type="submit">Sign Up</button>
    </form>
    <p id="message"></p>

    <script>
        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('http://localhost:3001/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password, fullName, phone })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Store token
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Redirect to dashboard
                    window.location.href = '/dashboard.html';
                } else {
                    document.getElementById('message').textContent = data.message;
                }
            } catch (error) {
                document.getElementById('message').textContent = 'Signup failed. Please try again.';
            }
        });
    </script>
</body>
</html>
```

### **JavaScript Helper Functions**

```javascript
// auth.js - Reusable auth functions

const API_URL = 'http://localhost:3001/api/auth';

// Signup
async function signup(email, password, fullName, phone = null) {
    const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, phone })
    });
    
    const data = await response.json();
    
    if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
}

// Login
async function login(email, password) {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
}

// Logout
async function logout() {
    const token = localStorage.getItem('token');
    
    if (token) {
        await fetch(`${API_URL}/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Get current user
async function getCurrentUser() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        return null;
    }
    
    const response = await fetch(`${API_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
        return data.user;
    }
    
    // Token invalid
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
}

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('token') !== null;
}

// Protect page (redirect if not logged in)
async function requireAuth() {
    const user = await getCurrentUser();
    
    if (!user) {
        window.location.href = '/login.html';
        return false;
    }
    
    return true;
}
```

---

## 🔧 **TROUBLESHOOTING**

### **Issue: "Supabase client not initialized"**

**Solution:** Check your `.env` file has:
```
SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key
JWT_SECRET=your-secret
```

### **Issue: "User with this email already exists"**

**Solution:** Email is already registered. Try logging in or use a different email.

### **Issue: "Invalid email or password"**

**Solution:** Check credentials are correct. Password is case-sensitive.

### **Issue: "Too many requests"**

**Solution:** Rate limit hit. Wait 15 minutes and try again.

### **Issue: "Validation failed"**

**Solution:** Check password meets requirements:
- Min 8 characters
- 1 uppercase letter
- 1 lowercase letter
- 1 number

---

## 📊 **API ENDPOINTS SUMMARY**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/verify-token` | Verify JWT token |

---

## ✅ **CHECKLIST**

- [ ] Server restarted
- [ ] Tested signup endpoint
- [ ] Tested login endpoint
- [ ] Tested protected route
- [ ] Frontend forms created
- [ ] Token stored in localStorage
- [ ] Logout function working

---

## 🎉 **YOU'RE DONE!**

Your authentication system is now fully functional and production-ready!

**Next Steps:**
1. Create your frontend login/signup pages
2. Integrate with your existing app
3. Add password reset flow
4. Customize user profile fields

---

**Need Help?**
- Check `AUTH_API_DOCUMENTATION.md` for detailed API docs
- Review error messages in server console
- Test with Postman/Thunder Client first

---

**Happy Coding!** 🚀
