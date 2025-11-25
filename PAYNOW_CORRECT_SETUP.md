# ✅ Correct Paynow Setup - Receive Payment Link (Not External Site)

## ⚠️ Important: You're in the Wrong Section!

The screenshot shows you're in **"External Site"** integration, which is for embedding payment forms on your website. This doesn't have Result URL and Return URL fields.

You need to create a **"Receive Payment Link"** instead, which is for API/backend integration.

---

## Step 1: Go to Receive Payment Links

1. In your Paynow dashboard (https://paynow.co.zw)
2. Look for **"Receive Payment Links"** in the left sidebar menu
3. Click on it

---

## Step 2: Create New Integration (If Needed)

### If you don't have a Receive Payment Link yet:

1. Click **"Create New Link"** or **"Add Integration"**
2. Fill in the form:
   - **Name**: ZimCrowd Payments (or any name)
   - **Currency**: USD
   - **Type**: Select **"Integration"** or **"API Integration"**

3. You'll see these fields:

```
┌─────────────────────────────────────────────────────┐
│ Integration Name: ZimCrowd Payments                 │
│                                                      │
│ Result URL:                                         │
│ [                                                 ] │
│                                                      │
│ Return URL:                                         │
│ [                                                 ] │
│                                                      │
│ Email Address:                                      │
│ [jothum@zimcrowd.co.zw                           ] │
│                                                      │
│                              [Create] [Cancel]      │
└─────────────────────────────────────────────────────┘
```

4. Enter the URLs:
   - **Result URL**: `https://zimcrowd-backend.vercel.app/api/payments/result`
   - **Return URL**: `https://zimcrowd.com/dashboard.html?payment=complete`
   - **Email**: `jothum@zimcrowd.co.zw`

5. Click **"Create"** or **"Save"**

---

## Step 3: Get Your Integration Credentials

After creating the integration, you'll see:

```
Integration ID: 12345
Integration Key: [Click to reveal or email]
```

**Copy these values** - you'll need them for Vercel environment variables.

---

## Alternative: Edit Existing Receive Payment Link

### If you already have a Receive Payment Link:

1. Go to **"Receive Payment Links"**
2. You'll see a list of your integrations
3. Find the one you want to use (e.g., "ZimCrowd Payments")
4. Click **"Edit"** or the **pencil icon**
5. You should now see **Result URL** and **Return URL** fields
6. Enter the URLs as shown above
7. Click **"Save"**

---

## What's the Difference?

### External Site Integration (What you're currently viewing)
- ❌ For embedding payment forms on your website
- ❌ No Result URL / Return URL fields
- ❌ Not for backend API integration
- ❌ Uses JavaScript widget
- **URL pattern**: `/ExternalSite/Edit/22095`

### Receive Payment Link (What you need)
- ✅ For backend/API integration
- ✅ Has Result URL and Return URL fields
- ✅ Works with Paynow SDK
- ✅ Sends webhook callbacks
- **URL pattern**: `/Integration/Edit/xxxxx` or similar

---

## Finding Receive Payment Links Section

Look for these menu items in your Paynow dashboard:

### Possible Menu Names:
- "Receive Payment Links"
- "Integration Links"
- "Payment Integrations"
- "API Integrations"
- "Merchant Integrations"

### Visual Location:
```
Paynow Dashboard
├── Dashboard
├── Transactions
├── Receive Payment Links  ← Click here
├── External Sites         ← NOT here (you're currently here)
├── Reports
└── Settings
```

---

## Step-by-Step with Screenshots Description

### 1. Main Dashboard
```
After login, you should see a sidebar with menu items.
Look for "Receive Payment Links" (not "External Sites").
```

### 2. Receive Payment Links Page
```
You'll see a list of your integrations:
┌────────────────────────────────────────────────┐
│ Receive Payment Links                          │
├────────────────────────────────────────────────┤
│ [+ Create New Link]                            │
│                                                 │
│ Name              Currency    Status   Actions │
│ ZimCrowd USD      USD         Active   [Edit]  │
│ ZimCrowd ZWG      ZWG         Active   [Edit]  │
└────────────────────────────────────────────────┘
```

### 3. Edit Integration Form
```
Click [Edit] and you'll see:
┌────────────────────────────────────────────────┐
│ Edit Integration                                │
├────────────────────────────────────────────────┤
│ Integration Name: [ZimCrowd USD              ] │
│                                                 │
│ Result URL:                                    │
│ [https://zimcrowd-backend.vercel.app/api/...  ]│
│                                                 │
│ Return URL:                                    │
│ [https://zimcrowd.com/dashboard.html?...      ]│
│                                                 │
│ Integration ID: 12345                          │
│ Integration Key: [View Key]                    │
│                                                 │
│                              [Save] [Cancel]    │
└────────────────────────────────────────────────┘
```

---

## If You Can't Find "Receive Payment Links"

### Option 1: Contact Paynow Support
Email: **support@paynow.co.zw**

Ask them:
> "I need to set up API integration with Result URL and Return URL for my merchant account. I can only see External Site integration. How do I create a Receive Payment Link for backend integration?"

### Option 2: Check Your Account Type
Some Paynow accounts may have limited features. You may need to:
- Upgrade your account
- Request API access
- Complete merchant verification

### Option 3: Use Different Integration Method
If "Receive Payment Links" is not available, ask Paynow support for:
- API documentation
- Alternative integration methods
- How to configure webhooks for your account type

---

## URLs You Need to Configure

Once you find the correct integration page:

### Result URL (Webhook - Required)
```
https://zimcrowd-backend.vercel.app/api/payments/result
```
**Purpose**: Paynow sends payment status updates here

### Return URL (Customer Redirect - Required)
```
https://zimcrowd.com/dashboard.html?payment=complete
```
**Purpose**: Customer is redirected here after payment

---

## After Configuration

Once you've set up the Receive Payment Link:

1. **Copy Integration ID and Key**
2. **Add to Vercel** (see PAYNOW_SETUP.md)
3. **Test with $1 payment**

---

## Quick Checklist

- [ ] Found "Receive Payment Links" section (NOT External Sites)
- [ ] Created or edited integration
- [ ] Entered Result URL
- [ ] Entered Return URL
- [ ] Saved configuration
- [ ] Copied Integration ID
- [ ] Copied Integration Key
- [ ] Added credentials to Vercel
- [ ] Ready to test

---

## Current Status

Based on your screenshot:
- ❌ You're in External Site integration (ID: 22095)
- ❌ This doesn't have Result URL / Return URL fields
- ✅ You need to find/create a "Receive Payment Link" integration
- ✅ That's where you'll configure the webhook URLs

---

**Next Step**: Navigate to "Receive Payment Links" section in your Paynow dashboard. If you can't find it, contact Paynow support for assistance.
