# 🎯 Paynow Integration Setup - Your Dashboard

Based on your screenshot, here's exactly what to do:

## Your Current Menu Options

From the **"Receive Payments"** dropdown, I can see:
- Create Payment Request
- Virtual Terminal
- Create Payment Button
- Other Ways To Get Paid
- Manage Payment Bank Accounts
- View Transaction History
- Merchant FAQ
- Reports

---

## Step 1: Click "Other Ways To Get Paid"

1. In the **"Receive Payments"** dropdown (currently open)
2. Click on **"Other Ways To Get Paid"**
3. This should show you integration options

---

## Step 2: Look for Integration/API Option

After clicking "Other Ways To Get Paid", you should see options like:
- **Integration** or **API Integration**
- **Receive Payment Links**
- **Developer Integration**
- **Website Integration**

Click on the one that mentions **Integration** or **API**.

---

## Step 3: Create or View Integration

You should see a page with:
- Option to create new integration
- List of existing integrations
- Integration settings

### If You See Existing Integrations:
Look for an integration with:
- **Integration ID: 22095** (from your earlier screenshot)
- Click **"Edit"** or **"Manage"**

### If No Integrations Exist:
- Click **"Create New Integration"** or similar button
- Fill in the form (see below)

---

## Step 4: Configure Integration Settings

When you edit or create an integration, you should see these fields:

### Required Fields:

**Integration Name:**
```
ZimCrowd Payments
```

**Result URL (Webhook URL):**
```
https://zimcrowd-backend.vercel.app/api/payments/result
```

**Return URL (Redirect URL):**
```
https://zimcrowd.com/dashboard.html?payment=complete
```

**Email Address:**
```
jothum@zimcrowd.co.zw
```

**Currency:**
```
USD
```

---

## Alternative Path: Check "My Account"

If "Other Ways To Get Paid" doesn't show integration options:

1. Click **"My Account"** (top right in your screenshot)
2. Look for:
   - **Integration Settings**
   - **API Settings**
   - **Developer Settings**
   - **Merchant Settings**

---

## What You're Looking For

The integration page should look like this:

```
┌─────────────────────────────────────────────────────┐
│ Integration Settings                                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Integration Name:                                   │
│ [ZimCrowd Payments                                ] │
│                                                      │
│ Integration ID: 22095                               │
│                                                      │
│ Integration Key:                                    │
│ [xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx             ] │
│ [Email Key] [Generate New Key]                      │
│                                                      │
│ Result URL (Webhook):                               │
│ [https://zimcrowd-backend.vercel.app/api/payments/result] │
│                                                      │
│ Return URL:                                         │
│ [https://zimcrowd.com/dashboard.html?payment=complete]    │
│                                                      │
│ Email Address:                                      │
│ [jothum@zimcrowd.co.zw                            ] │
│                                                      │
│                                    [Save] [Cancel]   │
└─────────────────────────────────────────────────────┘
```

---

## If You Can't Find Integration Settings

### Option 1: Use External Site (Workaround)

Since you have External Site ID **22095**, you can use it with these settings:

**In Vercel Environment Variables:**
```env
PAYNOW_USD_INTEGRATION_ID=22095
PAYNOW_USD_INTEGRATION_KEY=your_key_from_paynow
```

**The Integration Key:**
- Go back to External Site settings (your first screenshot)
- Click **"Email Key to jothum@zimcrowd.co.zw"**
- Check your email for the key
- Copy it to Vercel

**Note:** External Site integration may work for basic payments, but won't have webhook callbacks. You'll need to rely on polling.

### Option 2: Contact Paynow Support

**Email:** support@paynow.co.zw

**Message Template:**
```
Subject: Need API Integration with Webhook URLs

Hello Paynow Support,

I need to integrate Paynow payments into my website backend (zimcrowd.com).

I can see External Site integration (ID: 22095) in my dashboard, but I need:
1. Result URL (webhook) configuration
2. Return URL configuration
3. API integration for backend

How do I set up an integration with Result URL and Return URL fields?

My merchant email: jothum@zimcrowd.co.zw

Thank you.
```

---

## Quick Actions You Can Do Now

### 1. Get Your Integration Key

From your External Site page (first screenshot):
1. Click **"Email Key to jothum@zimcrowd.co.zw"**
2. Check your email
3. Copy the Integration Key

### 2. Add to Vercel (Even Without URLs)

You can start by adding what you have:

```env
PAYNOW_USD_INTEGRATION_ID=22095
PAYNOW_USD_INTEGRATION_KEY=paste_key_from_email
PAYNOW_RESULT_URL=https://zimcrowd-backend.vercel.app/api/payments/result
PAYNOW_RETURN_URL=https://zimcrowd.com/dashboard.html?payment=complete
```

### 3. Test Basic Payment

Even without webhook configuration in Paynow, you can test:
- Payment initiation will work
- Redirect to Paynow will work
- Customer can pay
- Return URL will work
- **Webhook won't work** (you'll need to rely on polling)

---

## Navigation Map for Your Dashboard

Based on your screenshot:

```
Paynow Dashboard
├── Make Payments ▼
├── Receive Payments ▼ (You are here)
│   ├── Create Payment Request
│   ├── Virtual Terminal
│   ├── Create Payment Button
│   ├── Other Ways To Get Paid ← Try this
│   ├── Manage Payment Bank Accounts
│   ├── View Transaction History
│   ├── Merchant FAQ
│   └── Reports
├── My Account ← Also check here
└── Log Off
```

---

## Next Steps

1. **Immediate:** Click **"Other Ways To Get Paid"** in the dropdown
2. **Look for:** Integration or API settings
3. **If found:** Configure Result URL and Return URL
4. **If not found:** Email Paynow support (template above)
5. **Meanwhile:** Get your Integration Key via email
6. **Then:** Add credentials to Vercel and test

---

## Expected Behavior After Setup

### With Webhook (Ideal):
✅ Customer pays → Paynow sends webhook → Backend updates wallet → Customer sees success

### Without Webhook (Fallback):
✅ Customer pays → Returns to site → Frontend polls status → Shows success

Both will work, but webhook is more reliable and faster.

---

**Action Required:** Click "Other Ways To Get Paid" and look for Integration/API settings. If you don't see it, contact Paynow support with the template above.
