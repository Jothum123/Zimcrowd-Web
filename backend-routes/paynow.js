/**
 * Paynow Payment Gateway Routes
 * Add this to your backend (zimcrowd-backend)
 * 
 * Required packages: npm install axios crypto
 * Required env vars: PAYNOW_INTEGRATION_ID, PAYNOW_INTEGRATION_KEY
 */

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const router = express.Router();

// Environment variables (set these in Vercel)
const PAYNOW_ID = process.env.PAYNOW_INTEGRATION_ID;
const PAYNOW_KEY = process.env.PAYNOW_INTEGRATION_KEY;
const PAYNOW_RESULT_URL = process.env.PAYNOW_RESULT_URL || 'https://zimcrowd-backend.vercel.app/api/payments/paynow/callback';
const PAYNOW_RETURN_URL = process.env.PAYNOW_RETURN_URL || 'https://zimcrowd.com/dashboard.html?payment=complete';

// Paynow URLs
const PAYNOW_INITIATE_URL = 'https://www.paynow.co.zw/interface/initiatetransaction';
const PAYNOW_EXPRESS_URL = 'https://www.paynow.co.zw/interface/remotetransaction';
const PAYNOW_TRACE_URL = 'https://www.paynow.co.zw/interface/trace';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate SHA512 hash for Paynow
 */
function generateHash(values, integrationKey) {
    const concatenated = values.join('') + integrationKey;
    return crypto
        .createHash('sha512')
        .update(concatenated, 'utf8')
        .digest('hex')
        .toUpperCase();
}

/**
 * Parse URL-encoded Paynow response
 */
function parsePaynowResponse(responseString) {
    const result = {};
    const orderedKeys = [];
    const pairs = responseString.split('&');
    
    for (const pair of pairs) {
        const [key, ...valueParts] = pair.split('=');
        const lowerKey = key.toLowerCase();
        const value = decodeURIComponent(valueParts.join('=').replace(/\+/g, ' '));
        result[lowerKey] = value;
        orderedKeys.push(lowerKey);
    }
    
    result._fieldOrder = orderedKeys;
    return result;
}

/**
 * Verify hash from Paynow response
 */
function verifyPaynowHash(response, integrationKey) {
    const values = [];
    
    for (const key of response._fieldOrder || Object.keys(response)) {
        if (key !== 'hash' && key !== '_fieldOrder' && response[key]) {
            values.push(response[key]);
        }
    }
    
    const expectedHash = generateHash(values, integrationKey);
    return expectedHash === response.hash?.toUpperCase();
}

/**
 * URL encode object for POST
 */
function urlEncode(obj) {
    return Object.entries(obj)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
}

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/payments/paynow/initiate
 * Initiate Web Checkout (redirect to Paynow)
 */
router.post('/initiate', async (req, res) => {
    try {
        const { amount, email, description } = req.body;
        const userId = req.user?.id || 'guest';
        
        // Validate
        if (!amount || parseFloat(amount) < 1) {
            return res.status(400).json({ success: false, message: 'Invalid amount. Minimum is $1.00' });
        }
        
        // Generate unique reference
        const reference = `ZC-${userId}-${Date.now()}`;
        const returnUrl = `${PAYNOW_RETURN_URL}&ref=${reference}`;
        
        // Prepare Paynow data
        const paynowData = {
            id: PAYNOW_ID,
            reference: reference,
            amount: parseFloat(amount).toFixed(2),
            additionalinfo: description || 'ZimCrowd Wallet Top-up',
            returnurl: returnUrl,
            resulturl: PAYNOW_RESULT_URL,
            status: 'Message'
        };
        
        if (email) {
            paynowData.authemail = email;
        }
        
        // Generate hash
        const hashValues = [
            paynowData.id,
            paynowData.reference,
            paynowData.amount,
            paynowData.additionalinfo,
            paynowData.returnurl,
            paynowData.resulturl
        ];
        if (email) hashValues.push(email);
        hashValues.push(paynowData.status);
        
        paynowData.hash = generateHash(hashValues, PAYNOW_KEY);
        
        // TODO: Save transaction to database
        // await db.transactions.create({
        //     user_id: userId,
        //     reference: reference,
        //     amount: parseFloat(amount),
        //     method: 'paynow_web',
        //     status: 'pending',
        //     created_at: new Date()
        // });
        
        console.log('Initiating Paynow transaction:', reference);
        
        // POST to Paynow
        const response = await axios.post(PAYNOW_INITIATE_URL, urlEncode(paynowData), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        const paynowResponse = parsePaynowResponse(response.data);
        console.log('Paynow response:', paynowResponse);
        
        // Check for error
        if (paynowResponse.status?.toLowerCase() === 'error') {
            return res.status(400).json({
                success: false,
                message: paynowResponse.error || 'Payment initiation failed'
            });
        }
        
        // Verify response hash
        if (!verifyPaynowHash(paynowResponse, PAYNOW_KEY)) {
            console.error('Hash verification failed');
            return res.status(400).json({ success: false, message: 'Security verification failed' });
        }
        
        // TODO: Update transaction with poll URL
        // await db.transactions.update({ poll_url: paynowResponse.pollurl }, { where: { reference } });
        
        return res.json({
            success: true,
            redirectUrl: paynowResponse.browserurl,
            pollUrl: paynowResponse.pollurl,
            reference: reference
        });
        
    } catch (error) {
        console.error('Paynow initiate error:', error);
        return res.status(500).json({ success: false, message: 'Failed to initiate payment' });
    }
});

/**
 * POST /api/payments/paynow/express
 * Express Checkout for mobile money (EcoCash, OneMoney, InnBucks)
 */
router.post('/express', async (req, res) => {
    try {
        const { amount, method, phone, email, description } = req.body;
        const userId = req.user?.id || 'guest';
        
        // Validate
        if (!amount || parseFloat(amount) < 1) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number required' });
        }
        if (!['ecocash', 'onemoney', 'innbucks'].includes(method)) {
            return res.status(400).json({ success: false, message: 'Invalid payment method' });
        }
        
        const reference = `ZC-${userId}-${Date.now()}`;
        const merchanttrace = `MT-${userId}-${Date.now()}`.substring(0, 32);
        const returnUrl = `${PAYNOW_RETURN_URL}&ref=${reference}`;
        
        // Prepare Express Checkout data
        const paynowData = {
            id: PAYNOW_ID,
            reference: reference,
            amount: parseFloat(amount).toFixed(2),
            additionalinfo: description || 'ZimCrowd Wallet Top-up',
            returnurl: returnUrl,
            resulturl: PAYNOW_RESULT_URL,
            authemail: email || '',
            phone: phone,
            method: method,
            merchanttrace: merchanttrace,
            status: 'Message'
        };
        
        // Generate hash (include all non-empty fields in order)
        const hashValues = [
            paynowData.id,
            paynowData.reference,
            paynowData.amount,
            paynowData.additionalinfo,
            paynowData.returnurl,
            paynowData.resulturl
        ];
        if (paynowData.authemail) hashValues.push(paynowData.authemail);
        hashValues.push(paynowData.phone);
        hashValues.push(paynowData.method);
        hashValues.push(paynowData.merchanttrace);
        hashValues.push(paynowData.status);
        
        paynowData.hash = generateHash(hashValues, PAYNOW_KEY);
        
        // TODO: Save transaction to database
        // await db.transactions.create({
        //     user_id: userId,
        //     reference: reference,
        //     merchanttrace: merchanttrace,
        //     amount: parseFloat(amount),
        //     method: method,
        //     phone: phone,
        //     status: 'pending'
        // });
        
        console.log('Initiating Express Checkout:', reference, method);
        
        // POST to Paynow Express
        const response = await axios.post(PAYNOW_EXPRESS_URL, urlEncode(paynowData), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        const paynowResponse = parsePaynowResponse(response.data);
        console.log('Paynow Express response:', paynowResponse);
        
        // Check for error
        if (paynowResponse.status?.toLowerCase() === 'error') {
            return res.status(400).json({
                success: false,
                message: paynowResponse.error || 'Payment failed'
            });
        }
        
        // TODO: Update transaction with poll URL
        // await db.transactions.update({ poll_url: paynowResponse.pollurl }, { where: { reference } });
        
        // Handle InnBucks specific response
        if (method === 'innbucks' && paynowResponse.authorizationcode) {
            return res.json({
                success: true,
                authorizationCode: paynowResponse.authorizationcode,
                authorizationExpires: paynowResponse.authorizationexpires,
                pollUrl: paynowResponse.pollurl,
                reference: reference,
                message: 'Enter the authorization code in your InnBucks app'
            });
        }
        
        // EcoCash/OneMoney response
        return res.json({
            success: true,
            instructions: paynowResponse.instructions || 'Check your phone for the payment prompt',
            pollUrl: paynowResponse.pollurl,
            reference: reference
        });
        
    } catch (error) {
        console.error('Paynow Express error:', error);
        return res.status(500).json({ success: false, message: 'Failed to initiate payment' });
    }
});

/**
 * POST /api/payments/paynow/status
 * Poll for payment status
 */
router.post('/status', async (req, res) => {
    try {
        const { pollUrl } = req.body;
        
        if (!pollUrl) {
            return res.status(400).json({ success: false, message: 'Poll URL is required' });
        }
        
        // Poll Paynow (empty POST)
        const response = await axios.post(pollUrl, '', {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        const statusResponse = parsePaynowResponse(response.data);
        console.log('Paynow status:', statusResponse);
        
        // Check if paid
        const isPaid = ['paid', 'awaiting delivery', 'delivered'].includes(
            statusResponse.status?.toLowerCase()
        );
        
        if (isPaid) {
            // TODO: Update transaction and credit wallet if not already done
            // const transaction = await db.transactions.findOne({ where: { poll_url: pollUrl } });
            // if (transaction && transaction.status !== 'completed') {
            //     await db.transactions.update({ status: 'completed' }, { where: { poll_url: pollUrl } });
            //     await db.wallets.increment('balance', { by: transaction.amount, where: { user_id: transaction.user_id } });
            // }
            
            return res.json({
                success: true,
                paid: true,
                status: statusResponse.status,
                amount: parseFloat(statusResponse.amount),
                reference: statusResponse.reference
            });
        }
        
        return res.json({
            success: true,
            paid: false,
            status: statusResponse.status || 'Pending'
        });
        
    } catch (error) {
        console.error('Paynow status error:', error);
        return res.status(500).json({ success: false, message: 'Failed to check payment status' });
    }
});

/**
 * POST /api/payments/paynow/verify
 * Verify payment by reference (when customer returns from Paynow)
 */
router.post('/verify', async (req, res) => {
    try {
        const { reference } = req.body;
        
        if (!reference) {
            return res.status(400).json({ success: false, message: 'Reference is required' });
        }
        
        // TODO: Find transaction by reference
        // const transaction = await db.transactions.findOne({ where: { reference } });
        // if (!transaction) {
        //     return res.status(404).json({ success: false, message: 'Transaction not found' });
        // }
        
        // For now, return pending (implement with database)
        return res.json({
            success: true,
            paid: false,
            status: 'Pending',
            message: 'Please implement database lookup'
        });
        
    } catch (error) {
        console.error('Paynow verify error:', error);
        return res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
});

/**
 * POST /api/payments/paynow/trace
 * Trace transaction by merchanttrace (for recovery)
 */
router.post('/trace', async (req, res) => {
    try {
        const { merchanttrace } = req.body;
        
        if (!merchanttrace) {
            return res.status(400).json({ success: false, message: 'Merchant trace is required' });
        }
        
        const traceData = {
            id: PAYNOW_ID,
            merchanttrace: merchanttrace,
            status: 'Message'
        };
        
        const hashValues = [traceData.id, traceData.merchanttrace, traceData.status];
        traceData.hash = generateHash(hashValues, PAYNOW_KEY);
        
        const response = await axios.post(PAYNOW_TRACE_URL, urlEncode(traceData), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        const traceResponse = parsePaynowResponse(response.data);
        
        if (traceResponse.status?.toLowerCase() === 'notfound') {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }
        
        if (traceResponse.status?.toLowerCase() === 'error') {
            return res.status(400).json({ success: false, message: traceResponse.error || 'Trace failed' });
        }
        
        return res.json({
            success: true,
            reference: traceResponse.reference,
            paynowReference: traceResponse.paynowreference,
            amount: traceResponse.amount,
            status: traceResponse.status,
            pollUrl: traceResponse.pollurl
        });
        
    } catch (error) {
        console.error('Paynow trace error:', error);
        return res.status(500).json({ success: false, message: 'Failed to trace transaction' });
    }
});

/**
 * POST /api/payments/paynow/callback
 * Webhook - Paynow posts status updates here
 */
router.post('/callback', async (req, res) => {
    try {
        console.log('Paynow callback received:', req.body);
        
        // Parse body (may be string or object depending on middleware)
        let paynowData;
        if (typeof req.body === 'string') {
            paynowData = parsePaynowResponse(req.body);
        } else {
            // If already parsed, reconstruct for hash verification
            paynowData = req.body;
            paynowData._fieldOrder = Object.keys(req.body);
        }
        
        const {
            reference,
            paynowreference,
            amount,
            status,
            pollurl,
            hash,
            // Optional fields
            token,
            tokenexpiry,
            paymentchannel,
            paymentinstrument
        } = paynowData;
        
        // Verify hash
        const hashValues = [reference, paynowreference, amount, status, pollurl];
        const expectedHash = generateHash(hashValues, PAYNOW_KEY);
        
        if (hash?.toUpperCase() !== expectedHash) {
            console.error('Callback hash verification failed');
            return res.status(400).send('Hash verification failed');
        }
        
        console.log(`Payment ${status}: ${reference}, Amount: ${amount}`);
        
        // TODO: Process based on status
        // const transaction = await db.transactions.findOne({ where: { reference } });
        // if (!transaction) {
        //     return res.status(404).send('Transaction not found');
        // }
        
        // if (['Paid', 'Awaiting Delivery', 'Delivered'].includes(status)) {
        //     if (transaction.status !== 'completed') {
        //         await db.transactions.update({ status: 'completed', paynow_reference: paynowreference }, { where: { reference } });
        //         await db.wallets.increment('balance', { by: parseFloat(amount), where: { user_id: transaction.user_id } });
        //     }
        // }
        
        // Respond OK to Paynow
        res.status(200).send('OK');
        
    } catch (error) {
        console.error('Paynow callback error:', error);
        res.status(500).send('Error');
    }
});

module.exports = router;
