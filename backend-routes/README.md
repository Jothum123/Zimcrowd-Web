# Backend Routes for ZimCrowd

These routes need to be added to your backend at `zimcrowd-backend.vercel.app`.

## Setup Instructions

### 1. Add Environment Variables in Vercel

Go to your Vercel project settings and add:

```env
PAYNOW_INTEGRATION_ID=your_integration_id_from_paynow
PAYNOW_INTEGRATION_KEY=your_integration_key_from_paynow
PAYNOW_RESULT_URL=https://zimcrowd-backend.vercel.app/api/payments/paynow/callback
PAYNOW_RETURN_URL=https://zimcrowd.com/dashboard.html?payment=complete
```

### 2. Install Dependencies

```bash
npm install axios
```

### 3. Add Routes to Your Backend

In your main Express app (e.g., `index.js` or `app.js`):

```javascript
const paynowRoutes = require('./routes/paynow');

// Mount Paynow routes
app.use('/api/payments/paynow', paynowRoutes);
```

### 4. For Vercel Serverless Functions

If using Vercel serverless functions, create these files in `/api/payments/paynow/`:

```
api/
  payments/
    paynow/
      initiate.js
      express.js
      status.js
      verify.js
      trace.js
      callback.js
```

Example serverless function (`api/payments/paynow/initiate.js`):

```javascript
const { initiate } = require('../../../lib/paynow');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    return initiate(req, res);
}
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments/paynow/initiate` | POST | Web checkout (redirect) |
| `/api/payments/paynow/express` | POST | Mobile money (EcoCash/OneMoney/InnBucks) |
| `/api/payments/paynow/status` | POST | Poll payment status |
| `/api/payments/paynow/verify` | POST | Verify by reference |
| `/api/payments/paynow/trace` | POST | Trace by merchanttrace |
| `/api/payments/paynow/callback` | POST | Webhook (Paynow posts here) |

## Database Integration

The routes have TODO comments where you need to add database operations:

1. **Save transaction** when initiating payment
2. **Update transaction** with poll URL
3. **Credit wallet** when payment confirmed
4. **Handle refunds/disputes**

Example with your existing database:

```javascript
// In your database model
const Transaction = {
    async create(data) {
        return await supabase.from('transactions').insert(data);
    },
    async findOne(where) {
        return await supabase.from('transactions').select().match(where).single();
    },
    async update(data, where) {
        return await supabase.from('transactions').update(data).match(where);
    }
};
```

## Testing

1. Get test credentials from Paynow dashboard
2. Test with small amounts first
3. Check callback URL is accessible (not localhost)
4. Verify hash generation matches Paynow examples
