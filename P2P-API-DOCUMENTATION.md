# ZimCrowd P2P Lending API Documentation

## 🎯 Overview
Complete API documentation for ZimCrowd's Peer-to-Peer Lending Platform with Primary and Secondary Markets.

---

## 🏦 PRIMARY MARKET API
**Base URL:** `/api/p2p/primary`

Handles loan marketplace where borrowers request loans and lenders fund them.

### 1. Create Loan Listing (Borrower)
**POST** `/api/p2p/primary/create-listing`

Create a new loan request in the marketplace.

**Authentication:** Required

**Request Body:**
```json
{
  "amount": 100,
  "termMonths": 12,
  "requestedInterestRate": 0.08,
  "maxInterestRate": 0.10,
  "purpose": "Business expansion",
  "loanType": "business"
}
```

**Validation:**
- `amount`: $50 - $100,000 (First-time borrowers: $50-$100 max)
- `termMonths`: 1 - 84 months
- `requestedInterestRate`: 0 - 0.10 (0% - 10%)
- `maxInterestRate`: 0 - 0.10 (0% - 10%)
- `purpose`: Required
- `loanType`: personal | business | emergency

**Response:**
```json
{
  "success": true,
  "listing": {
    "id": "uuid",
    "loan_id": "uuid",
    "amount_requested": 100,
    "loan_term_months": 12,
    "requested_interest_rate": 0.08,
    "status": "active",
    "is_first_time_borrower": true,
    "cold_start_amount": 100
  },
  "loan": { ... },
  "isFirstTimeBorrower": true,
  "coldStartAmount": 100
}
```

**Cold Start System:**
- First-time borrowers limited to $50-$100
- System auto-detects first-time status
- Returns `coldStartLimit` if amount exceeds limit

---

### 2. Browse Loan Marketplace (Lenders)
**GET** `/api/p2p/primary/browse`

Browse active loan listings with filters.

**Authentication:** Public

**Query Parameters:**
```
?minAmount=50
&maxAmount=1000
&maxInterestRate=0.10
&minStarRating=3.0
&page=1
&limit=20
```

**Response:**
```json
{
  "success": true,
  "listings": [
    {
      "id": "uuid",
      "borrower_name": "John Doe",
      "amount_requested": 500,
      "loan_term_months": 12,
      "requested_interest_rate": 0.08,
      "borrower_star_rating": 4.2,
      "funding_goal": 500,
      "amount_funded": 200,
      "funding_percentage": 40,
      "lender_offers": 3,
      "avg_offered_rate": 0.09,
      "min_offered_rate": 0.08
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### 3. Get Single Listing Details
**GET** `/api/p2p/primary/listing/:id`

Get detailed information about a specific loan listing.

**Authentication:** Public

**Response:**
```json
{
  "success": true,
  "listing": {
    "id": "uuid",
    "amount_requested": 500,
    "purpose": "Business expansion",
    "loan_term_months": 12,
    "requested_interest_rate": 0.08,
    "borrower_star_rating": 4.2,
    "loans": { ... },
    "lender_funding_offers": [
      {
        "id": "uuid",
        "offer_amount": 200,
        "offered_interest_rate": 0.09,
        "status": "pending"
      }
    ]
  }
}
```

---

### 4. Make Funding Offer (Lender)
**POST** `/api/p2p/primary/make-offer`

Make a funding offer on a loan listing.

**Authentication:** Required

**Request Body:**
```json
{
  "listingId": "uuid",
  "offerAmount": 200,
  "offeredInterestRate": 0.09,
  "offerType": "partial",
  "autoFund": false
}
```

**Validation:**
- `offerAmount`: Minimum $50
- `offeredInterestRate`: 0 - 0.10 (0% - 10%)
- `offerType`: partial | full | conditional

**Response:**
```json
{
  "success": true,
  "offer": {
    "id": "uuid",
    "listing_id": "uuid",
    "offer_amount": 200,
    "offered_interest_rate": 0.09,
    "funding_percentage": 40,
    "status": "pending",
    "expiry_date": "2024-12-01T00:00:00Z"
  },
  "message": "Funding offer submitted successfully"
}
```

---

### 5. Accept Funding Offer (Borrower)
**POST** `/api/p2p/primary/accept-offer/:offerId`

Accept a lender's funding offer.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Funding offer accepted successfully"
}
```

**Side Effects:**
- Creates loan investment holding for lender
- Updates listing funding status
- May mark listing as "funded" if goal reached

---

### 6. Get My Listings (Borrower)
**GET** `/api/p2p/primary/my-listings`

Get borrower's own loan listings.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "listings": [
    {
      "id": "uuid",
      "amount_requested": 500,
      "status": "active",
      "funding_percentage": 60,
      "lender_funding_offers": { "count": 5 }
    }
  ]
}
```

---

### 7. Get My Offers (Lender)
**GET** `/api/p2p/primary/my-offers`

Get lender's funding offers.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "offers": [
    {
      "id": "uuid",
      "offer_amount": 200,
      "offered_interest_rate": 0.09,
      "status": "accepted",
      "loan_marketplace_listings": {
        "amount_requested": 500,
        "purpose": "Business expansion"
      }
    }
  ]
}
```

---

### 8. Marketplace Statistics
**GET** `/api/p2p/primary/marketplace-stats`

Get overall marketplace statistics.

**Authentication:** Public

**Response:**
```json
{
  "success": true,
  "stats": {
    "activeListings": 45,
    "totalFundingVolume": 125000,
    "averageInterestRate": "8.50%",
    "totalLenders": 120,
    "totalBorrowers": 85
  }
}
```

---

## 🔄 SECONDARY MARKET API
**Base URL:** `/api/p2p/secondary`

Handles loan trading where lenders sell their loan investments.

### 1. List Loan for Sale (Lender)
**POST** `/api/p2p/secondary/list-for-sale`

List a loan investment for sale on secondary market.

**Authentication:** Required

**Request Body:**
```json
{
  "holdingId": "uuid",
  "askingPrice": 450,
  "listingType": "fixed"
}
```

**Validation:**
- `holdingId`: Must be valid UUID
- `askingPrice`: Must be positive
- `listingType`: fixed | auction | negotiable

**Response:**
```json
{
  "success": true,
  "listing": {
    "id": "uuid",
    "holding_id": "uuid",
    "outstanding_balance": 500,
    "asking_price": 450,
    "discount_premium": -10.00,
    "status": "active",
    "listing_expiry": "2024-12-01T00:00:00Z"
  },
  "message": "Loan listed for sale successfully"
}
```

**Discount/Premium Calculation:**
- Negative % = Discount (selling below balance)
- Positive % = Premium (selling above balance)

---

### 2. Browse Secondary Market
**GET** `/api/p2p/secondary/browse`

Browse loans available for purchase.

**Authentication:** Public

**Query Parameters:**
```
?minDiscount=-20
&maxPrice=1000
&page=1
&limit=20
```

**Response:**
```json
{
  "success": true,
  "listings": [
    {
      "id": "uuid",
      "seller_name": "Jane Smith",
      "outstanding_balance": 500,
      "asking_price": 450,
      "discount_premium": -10.00,
      "loan_percentage": 0.50,
      "months_remaining": 8,
      "projected_yield": 0.085
    }
  ],
  "pagination": { ... }
}
```

---

### 3. Make Purchase Offer
**POST** `/api/p2p/secondary/make-offer`

Make an offer to purchase a loan investment.

**Authentication:** Required

**Request Body:**
```json
{
  "listingId": "uuid",
  "sellerId": "uuid",
  "offerPrice": 425,
  "offerType": "full"
}
```

**Response:**
```json
{
  "success": true,
  "offer": {
    "id": "uuid",
    "listing_id": "uuid",
    "offer_price": 425,
    "status": "pending",
    "expiry_date": "2024-12-01T00:00:00Z"
  },
  "message": "Purchase offer submitted successfully"
}
```

---

### 4. Get My Secondary Listings (Seller)
**GET** `/api/p2p/secondary/my-listings`

Get lender's secondary market listings.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "listings": [
    {
      "id": "uuid",
      "outstanding_balance": 500,
      "asking_price": 450,
      "discount_premium": -10.00,
      "status": "active",
      "secondary_market_offers": { "count": 2 }
    }
  ]
}
```

---

### 5. Get My Purchase Offers (Buyer)
**GET** `/api/p2p/secondary/my-offers`

Get buyer's purchase offers.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "offers": [
    {
      "id": "uuid",
      "offer_price": 425,
      "status": "pending",
      "secondary_market_listings": {
        "outstanding_balance": 500,
        "asking_price": 450
      }
    }
  ]
}
```

---

### 6. Get Lender Portfolio
**GET** `/api/p2p/secondary/portfolio`

Get lender's complete investment portfolio.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "portfolio": {
    "total_investments": 15,
    "total_invested": 7500,
    "current_outstanding": 6200,
    "total_received": 1800,
    "total_interest": 500,
    "average_yield": 0.085,
    "active_investments": 12,
    "defaulted_investments": 1,
    "for_sale_count": 2
  },
  "holdings": [
    {
      "id": "uuid",
      "principal_amount": 500,
      "current_outstanding_balance": 400,
      "total_payments_received": 150,
      "interest_earned": 50,
      "current_yield": 0.09,
      "status": "active"
    }
  ]
}
```

---

### 7. Get Secondary Listing Details
**GET** `/api/p2p/secondary/listing/:id`

Get detailed information about a secondary market listing.

**Authentication:** Public

**Response:**
```json
{
  "success": true,
  "listing": {
    "id": "uuid",
    "outstanding_balance": 500,
    "asking_price": 450,
    "discount_premium": -10.00,
    "loan_investment_holdings": {
      "principal_amount": 600,
      "total_payments_received": 150,
      "interest_earned": 50,
      "current_yield": 0.09
    },
    "loans": {
      "amount": 1000,
      "status": "active",
      "interest_rate": 0.08
    },
    "secondary_market_offers": [...]
  }
}
```

---

### 8. Secondary Market Statistics
**GET** `/api/p2p/secondary/market-stats`

Get secondary market statistics.

**Authentication:** Public

**Response:**
```json
{
  "success": true,
  "stats": {
    "activeListings": 25,
    "totalVolumeTraded": 45000,
    "averageDiscount": "-8.50%",
    "totalTransfers": 120
  }
}
```

---

## 🔐 Authentication

All protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Get token from login endpoint:
```
POST /api/auth/login
POST /api/phone-auth/login
POST /api/email-auth/login
```

---

## ⚠️ Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be between $50 and $100,000"
    }
  ]
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🎯 Key Features

### Cold Start System
- First-time borrowers: $50-$100 limit
- Auto-detection based on loan history
- Gradual increase with good repayment

### Interest Rates
- User-selected: 0-10% range
- No system recommendations
- Market-driven competitive bidding

### ZimScore Integration
- Internal score: 30-85 (private)
- Star rating: 1.0-5.0 (public)
- Risk grades: A-E (auto-calculated)

### Secondary Market
- Premium/discount pricing
- Loan ownership transfers
- Portfolio liquidity

---

## 📝 Testing Endpoints

Use these test commands:

```bash
# Browse marketplace
curl http://localhost:5000/api/p2p/primary/browse

# Get marketplace stats
curl http://localhost:5000/api/p2p/primary/marketplace-stats

# Create listing (requires auth)
curl -X POST http://localhost:5000/api/p2p/primary/create-listing \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"termMonths":12,"requestedInterestRate":0.08,"purpose":"Test"}'
```

---

## 🚀 Next Steps

1. **Test Endpoints** - Use Postman or curl
2. **Integrate Frontend** - Connect UI to API
3. **Deploy Backend** - Push to production
4. **Monitor Performance** - Track API usage

---

**API Version:** 1.0.0  
**Last Updated:** November 2024  
**Support:** support@zimcrowd.co.zw
