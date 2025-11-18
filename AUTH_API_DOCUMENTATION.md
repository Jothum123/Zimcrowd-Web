# 🔐 ZimCrowd Authentication API Documentation

## Production-Ready Authentication System

Complete authentication system with signup, login, logout, password reset, and token management.

---

## 📋 Table of Contents

1. [Base URL](#base-url)
2. [Authentication Endpoints](#authentication-endpoints)
3. [Request/Response Examples](#requestresponse-examples)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Security Features](#security-features)

---

## 🌐 Base URL

```
Development: http://localhost:3001/api/auth
Production: https://your-domain.com/api/auth
```

---

## 🔑 Authentication Endpoints

### 1. **Signup** (Register New User)

**Endpoint:** `POST /api/auth/signup`

**Description:** Register a new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "fullName": "John Doe",
  "phone": "+263771234567" // Optional
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "fullName": "John Doe",
    "phone": "+263771234567"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

**Validation Rules:**
- Email: Valid email format
- Password: Min 8 characters, 1 uppercase, 1 lowercase, 1 number
- Full Name: 2-100 characters
- Phone: Optional, valid international format

**Rate Limit:** 3 requests per hour

---

### 2. **Login**

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and get access token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "fullName": "John Doe",
    "phone": "+263771234567",
    "emailVerified": true,
    "phoneVerified": false,
    "zimscore": 650,
    "walletBalance": 150.50
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "supabaseToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**Rate Limit:** 5 requests per 15 minutes

---

### 3. **Logout**

**Endpoint:** `POST /api/auth/logout`

**Description:** Logout user and invalidate session

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "No token provided"
}
```

---

### 4. **Get Current User**

**Endpoint:** `GET /api/auth/me`

**Description:** Get current authenticated user details

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "fullName": "John Doe",
    "phone": "+263771234567",
    "emailVerified": true,
    "phoneVerified": false,
    "zimscore": 650,
    "walletBalance": 150.50,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

### 5. **Forgot Password**

**Endpoint:** `POST /api/auth/forgot-password`

**Description:** Request password reset email

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "If an account exists with this email, you will receive a password reset link"
}
```

**Note:** Always returns success to prevent email enumeration

**Rate Limit:** 3 requests per hour

---

### 6. **Reset Password**

**Endpoint:** `POST /api/auth/reset-password`

**Description:** Reset password using reset token

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Invalid or expired reset token"
}
```

---

### 7. **Verify Token**

**Endpoint:** `POST /api/auth/verify-token`

**Description:** Check if JWT token is valid

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**OR Request Body:**
```json
{
  "token": "YOUR_JWT_TOKEN"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token is valid",
  "valid": true,
  "userId": "uuid-here",
  "email": "user@example.com"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "valid": false
}
```

---

## 📝 Request/Response Examples

### **JavaScript (Fetch API)**

#### Signup
```javascript
const signup = async (email, password, fullName) => {
  const response = await fetch('http://localhost:3001/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password, fullName })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store token
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  } else {
    throw new Error(data.message);
  }
};
```

#### Login
```javascript
const login = async (email, password) => {
  const response = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  } else {
    throw new Error(data.message);
  }
};
```

#### Get Current User
```javascript
const getCurrentUser = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:3001/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  
  if (data.success) {
    return data.user;
  } else {
    // Token invalid, redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};
```

#### Logout
```javascript
const logout = async () => {
  const token = localStorage.getItem('token');
  
  await fetch('http://localhost:3001/api/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};
```

---

## ⚠️ Error Handling

### **Error Response Format**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### **HTTP Status Codes**

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (Signup) |
| 400 | Bad Request (Validation Error) |
| 401 | Unauthorized (Invalid Credentials/Token) |
| 404 | Not Found |
| 429 | Too Many Requests (Rate Limited) |
| 500 | Internal Server Error |

---

## 🚦 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/signup` | 3 requests | 1 hour |
| `/login` | 5 requests | 15 minutes |
| `/forgot-password` | 3 requests | 1 hour |
| Other endpoints | No limit | - |

**Rate Limit Response (429):**
```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

---

## 🔒 Security Features

### **1. Password Requirements**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- Hashed using bcrypt (10 rounds)

### **2. JWT Tokens**
- 7-day expiration
- Signed with HS256 algorithm
- Contains: userId, email
- Stored in `Authorization` header as `Bearer TOKEN`

### **3. Rate Limiting**
- IP-based rate limiting
- Prevents brute force attacks
- Configurable limits per endpoint

### **4. Input Validation**
- Email format validation
- Password strength validation
- SQL injection prevention
- XSS protection

### **5. Secure Password Reset**
- Time-limited reset tokens
- One-time use tokens
- Email verification required

---

## 🧪 Testing

### **Test User Credentials**
```
Email: test.user1@zimcrowd.com
Password: Test123!
```

### **Postman Collection**

Import this collection to test all endpoints:

```json
{
  "info": {
    "name": "ZimCrowd Auth API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Signup",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/signup",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"Test123!\",\n  \"fullName\": \"Test User\"\n}"
        }
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/login",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"Test123!\"\n}"
        }
      }
    }
  ]
}
```

---

## 📞 Support

For issues or questions:
- Email: support@zimcrowd.com
- Documentation: https://docs.zimcrowd.com

---

**Last Updated:** November 18, 2025
**API Version:** 1.0.0
