# 📱 Twilio SMS Integration Setup

## Step 1: Get Twilio Account

### Sign Up for Twilio
1. Go to: [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for free account
3. Verify your phone number
4. Get $15 free credit

### Get Your Credentials
After signup, you'll get:
- **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Auth Token**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Phone Number**: `+1234567890` (your Twilio number)

### Create Messaging Service (Recommended)
For better SMS deliverability and professional setup:

1. Go to: [https://console.twilio.com/](https://console.twilio.com/)
2. Navigate to **Messaging → Services**
3. Click **"Create Messaging Service"**
4. **Service Name**: `ZimCrowd SMS`
5. **Use Case**: Choose "Notifications, Reminders, and Alerts"
6. **Sender Type**: "Phone Number"
7. Click **"Add Senders"** and select your Twilio phone number
8. **Messaging Service SID**: Copy this (starts with `MGxxxxxxxx`)

### Find Your Credentials
1. Go to: [https://console.twilio.com/](https://console.twilio.com/)
2. Dashboard → Account Info
3. Copy:
   - Account SID
   - Auth Token
4. Phone Numbers → Manage → Active Numbers
5. Copy your Twilio phone number
6. Messaging → Services → Copy Messaging Service SID

---

## Step 2: Add to Environment Variables

Add these to your `.env` file:
```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Add to Vercel environment variables:
1. Go to: https://vercel.com/jojola/zimcrowd-backend/settings/environment-variables
2. Add each variable above
3. Click "Redeploy" after adding all

---

## Step 3: Install Twilio SDK

```bash
cd c:\Users\Moffat\Documents\Zimcrowd-Web
npm install twilio
```

---

## Step 4: Test Twilio

After setup, test with:
```javascript
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

client.messages.create({
    body: 'Test message from ZimCrowd!',
    from: process.env.TWILIO_PHONE_NUMBER,
    to: '+1234567890' // Your phone number
});
```

---

## Pricing (Very Affordable)

| Service | Cost |
|---------|------|
| **SMS (US/Canada)** | $0.0075 per message |
| **SMS (International)** | $0.05 - $0.20 per message |
| **Phone Number** | $1/month |
| **Free Trial** | $15 credit (2000+ SMS) |

---

## Next Steps

1. ✅ Sign up for Twilio
2. ✅ Get credentials (SID, Token, Phone Number)
3. ✅ Add to environment variables
4. ✅ Install npm package
5. ✅ Test SMS sending
6. ✅ Integrate with backend
7. ✅ Update frontend UI
8. ✅ Test full flow

---

**Ready to start? Sign up at:** https://www.twilio.com/try-twilio
