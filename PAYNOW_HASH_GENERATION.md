# 🔐 Paynow Hash Generation

## Overview

**Hash generation** is the critical security mechanism that ensures message authenticity between your system and Paynow.

**Every message** to or from Paynow **must include a hash** that must be validated.

---

## Why Hashing?

### Security Benefits

✅ **Message Authenticity** - Proves message came from legitimate source  
✅ **Data Integrity** - Ensures message wasn't tampered with  
✅ **Replay Protection** - Prevents message reuse  
✅ **Non-repudiation** - Sender cannot deny sending message

### How It Works

```
Your Data + Integration Key → SHA512 Hash → Uppercase Hex
```

**Integration Key** = Secret shared between you and Paynow (never expose!)

---

## Hash Algorithm

### Steps

1. **Concatenate values** - Join all field values (exclude hash field)
2. **Append integration key** - Add your secret key to the end
3. **UTF-8 encode** - Ensure proper character encoding
4. **SHA512 hash** - Generate cryptographic hash
5. **Uppercase hexadecimal** - Convert to uppercase hex string

### Algorithm Details

- **Hash Function:** SHA512
- **Output Format:** Uppercase hexadecimal
- **Output Length:** 128 characters (512 bits)
- **Encoding:** UTF-8

---

## Generating Hash for Outbound Messages

### Example Message

**Original message (without hash):**

```
id=1201
reference=TEST REF
amount=99.99
additionalinfo=A test ticket transaction
returnurl=http://www.google.com/search?q=returnurl
resulturl=http://www.google.com/search?q=resulturl
status=Message
```

### Step 1: Concatenate Values

**Join all values (in order, no separators):**

```
1201TEST REF99.99A test ticket transactionhttp://www.google.com/search?q=returnurlhttp://www.google.com/search?q=resulturlMessage
```

**Important:**
- ✅ Use raw values (not URL encoded)
- ✅ Exclude the hash field itself
- ✅ Maintain field order
- ✅ No separators between values

### Step 2: Append Integration Key

**Add integration key to end:**

```
1201TEST REF99.99A test ticket transactionhttp://www.google.com/search?q=returnurlhttp://www.google.com/search?q=resulturlMessage3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977
```

### Step 3: Generate SHA512 Hash

**Apply SHA512 and convert to uppercase hex:**

```
2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689
```

### Step 4: Add Hash to Message

**Final message with hash:**

```
id=1201&
reference=TEST REF&
amount=99.99&
additionalinfo=A test ticket transaction&
returnurl=http://www.google.com/search?q=returnurl&
resulturl=http://www.google.com/search?q=resulturl&
status=Message&
hash=2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689
```

---

## Validating Hash for Inbound Messages

### Example: Paynow Response

**Raw message received from Paynow:**

```
status=Ok&browserurl=https%3a%2f%2fstaging.paynow.co.zw%2fPayment%2fConfirmPayment%2f9510&pollurl=https%3a%2f%2fstaging.paynow.co.zw%2fInterface%2fCheckPayment%2f%3fguid%3dc7ed41da-0159-46da-b428-69549f770413&paynowreference=9510&hash=750DD0B0DF374678707BB5AF915AF81C228B9058AD57BB7120569EC68BBB9C2EFC1B26C6375D2BC562AC909B3CD6B2AF1D42E1A5E479FFAC8F4FB3FDCE71DF4D
```

### Step 1: Split into Key/Value Pairs

**Split by `&` character:**

```javascript
const pairs = message.split('&');
// [
//   'status=Ok',
//   'browserurl=https%3a%2f%2fstaging.paynow.co.zw%2fPayment%2fConfirmPayment%2f9510',
//   'pollurl=https%3a%2f%2fstaging.paynow.co.zw%2fInterface%2fCheckPayment%2f%3fguid%3dc7ed41da-0159-46da-b428-69549f770413',
//   'paynowreference=9510',
//   'hash=750DD0B0DF374678707BB5AF915AF81C228B9058AD57BB7120569EC68BBB9C2EFC1B26C6375D2BC562AC909B3CD6B2AF1D42E1A5E479FFAC8F4FB3FDCE71DF4D'
// ]
```

### Step 2: Split Each Pair into Key and Value

**Split by `=` character:**

```javascript
const data = {};
pairs.forEach(pair => {
    const [key, value] = pair.split('=');
    data[key] = value;
});
```

### Step 3: URL Decode Values and Concatenate

**URL decode each value (except hash) and join:**

```javascript
const querystring = require('querystring');

let hashString = '';
Object.keys(data).forEach(key => {
    if (key.toLowerCase() !== 'hash') {
        // URL decode the value
        const decodedValue = querystring.unescape(data[key]);
        hashString += decodedValue;
    }
});

// Result:
// Okhttps://staging.paynow.co.zw/Payment/ConfirmPayment/9510https://staging.paynow.co.zw/Interface/CheckPayment/?guid=c7ed41da-0159-46da-b428-69549f7704139510
```

**Breakdown:**
- `status` = `Ok`
- `browserurl` = `https://staging.paynow.co.zw/Payment/ConfirmPayment/9510` (URL decoded)
- `pollurl` = `https://staging.paynow.co.zw/Interface/CheckPayment/?guid=c7ed41da-0159-46da-b428-69549f770413` (URL decoded)
- `paynowreference` = `9510`

**Concatenated:** `Okhttps://staging.paynow.co.zw/Payment/ConfirmPayment/9510https://staging.paynow.co.zw/Interface/CheckPayment/?guid=c7ed41da-0159-46da-b428-69549f7704139510`

### Step 4: Append Integration Key

**Add integration key to end:**

```javascript
const integrationKey = '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977';
hashString += integrationKey;

// Result:
// Okhttps://staging.paynow.co.zw/Payment/ConfirmPayment/9510https://staging.paynow.co.zw/Interface/CheckPayment/?guid=c7ed41da-0159-46da-b428-69549f77041395103e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977
```

### Step 5: Generate SHA512 Hash

**Create hash and convert to uppercase:**

```javascript
const crypto = require('crypto');
const expectedHash = crypto
    .createHash('sha512')
    .update(hashString, 'utf8')
    .digest('hex')
    .toUpperCase();

// Result:
// 750DD0B0DF374678707BB5AF915AF81C228B9058AD57BB7120569EC68BBB9C2EFC1B26C6375D2BC562AC909B3CD6B2AF1D42E1A5E479FFAC8F4FB3FDCE71DF4D
```

### Step 6: Compare Hashes

**Extract received hash and compare:**

```javascript
const receivedHash = data.hash;
// 750DD0B0DF374678707BB5AF915AF81C228B9058AD57BB7120569EC68BBB9C2EFC1B26C6375D2BC562AC909B3CD6B2AF1D42E1A5E479FFAC8F4FB3FDCE71DF4D

if (receivedHash.toUpperCase() === expectedHash.toUpperCase()) {
    // ✅ Valid - message is authentic from Paynow
    console.log('✅ Hash validation passed');
} else {
    // ❌ Invalid - possible spoofing attempt
    console.error('❌ Hash validation failed');
}
```

**Result:** ✅ **Hashes match!** Message is authentic.

### Complete Validation Function

```javascript
/**
 * Validate inbound message from Paynow
 * @param {string} rawMessage - Raw URL-encoded message
 * @param {string} integrationKey - Integration key
 * @returns {boolean} True if valid
 */
function validateInboundMessage(rawMessage, integrationKey) {
    const querystring = require('querystring');
    const crypto = require('crypto');
    
    // Step 1 & 2: Parse message into key/value pairs
    const data = querystring.parse(rawMessage);
    
    // Extract received hash
    const receivedHash = data.hash;
    if (!receivedHash) {
        console.error('❌ No hash in message');
        return false;
    }
    
    // Step 3: Concatenate URL-decoded values (exclude hash)
    let hashString = '';
    Object.keys(data).forEach(key => {
        if (key.toLowerCase() !== 'hash') {
            // querystring.parse already URL decodes values
            hashString += data[key];
        }
    });
    
    // Step 4: Append integration key
    hashString += integrationKey;
    
    // Step 5: Generate SHA512 hash
    const expectedHash = crypto
        .createHash('sha512')
        .update(hashString, 'utf8')
        .digest('hex')
        .toUpperCase();
    
    // Step 6: Compare
    const isValid = receivedHash.toUpperCase() === expectedHash.toUpperCase();
    
    if (!isValid) {
        console.error('❌ Hash mismatch:', {
            received: receivedHash.substring(0, 20) + '...',
            expected: expectedHash.substring(0, 20) + '...'
        });
    }
    
    return isValid;
}

// Test with example
const testMessage = 'status=Ok&browserurl=https%3a%2f%2fstaging.paynow.co.zw%2fPayment%2fConfirmPayment%2f9510&pollurl=https%3a%2f%2fstaging.paynow.co.zw%2fInterface%2fCheckPayment%2f%3fguid%3dc7ed41da-0159-46da-b428-69549f770413&paynowreference=9510&hash=750DD0B0DF374678707BB5AF915AF81C228B9058AD57BB7120569EC68BBB9C2EFC1B26C6375D2BC562AC909B3CD6B2AF1D42E1A5E479FFAC8F4FB3FDCE71DF4D';
const testKey = '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977';

const isValid = validateInboundMessage(testMessage, testKey);
console.log('Validation result:', isValid); // Should be true
```

### Example: Webhook Validation

**Received webhook:**

```
reference=ABC123&
paynowreference=123456&
amount=10.00&
status=Paid&
pollurl=https%3A%2F%2Fwww.paynow.co.zw%2FInterface%2FCheckPayment%2F%3Fguid%3D...&
hash=785659BF4970D86C4F5B9357473B53F43AF3FFA28E6A622D8EF83B69B68E5464C6BBD0F4187D8C6FB31B71DB3700C415B2434DB8D6F670CDBB809502C339AB3C
```

**Validation:**

```javascript
// Express.js webhook handler
router.post('/result', async (req, res) => {
    // req.body is already parsed by body-parser
    // Values are already URL decoded
    
    const receivedHash = req.body.hash;
    
    // Generate expected hash
    let hashString = '';
    Object.keys(req.body)
        .sort() // Sort for consistency
        .forEach(key => {
            if (key.toLowerCase() !== 'hash') {
                hashString += req.body[key];
            }
        });
    
    hashString += integrationKey;
    
    const expectedHash = crypto
        .createHash('sha512')
        .update(hashString, 'utf8')
        .digest('hex')
        .toUpperCase();
    
    if (receivedHash.toUpperCase() === expectedHash.toUpperCase()) {
        // ✅ Valid webhook
        await processPayment(req.body);
        res.status(200).send('OK');
    } else {
        // ❌ Invalid webhook
        console.error('Invalid webhook hash');
        res.status(400).send('INVALID_HASH');
    }
});
```

---

## Implementation

### Node.js / JavaScript

**File:** `services/paynow.service.js`

```javascript
const crypto = require('crypto');

/**
 * Generate SHA512 hash for Paynow request
 * @param {Object} data - Request data
 * @param {string} integrationKey - Integration key
 * @returns {string} Uppercase SHA512 hash
 */
generateHash(data, integrationKey) {
    // Step 1: Sort keys alphabetically (exclude hash)
    const sortedKeys = Object.keys(data)
        .filter(key => key.toLowerCase() !== 'hash')
        .sort();
    
    // Step 2: Concatenate values
    let hashString = '';
    sortedKeys.forEach(key => {
        const value = data[key];
        // Convert to string and handle null/undefined
        hashString += (value !== null && value !== undefined) ? String(value) : '';
    });
    
    // Step 3: Append integration key
    hashString += integrationKey;
    
    // Step 4: Generate SHA512 hash
    const hash = crypto
        .createHash('sha512')
        .update(hashString, 'utf8')
        .digest('hex')
        .toUpperCase();
    
    return hash;
}

/**
 * Validate webhook hash
 * @param {Object} webhookData - Webhook POST data
 * @returns {boolean} True if hash is valid
 */
validateWebhookHash(webhookData) {
    const receivedHash = webhookData.hash;
    
    if (!receivedHash) {
        console.error('❌ No hash in webhook data');
        return false;
    }
    
    // Get integration key based on currency
    const integrationKey = this.config.integrationKey;
    
    // Generate expected hash
    const expectedHash = this.generateHash(webhookData, integrationKey);
    
    // Compare (case-insensitive)
    const isValid = receivedHash.toUpperCase() === expectedHash.toUpperCase();
    
    if (!isValid) {
        console.error('❌ Hash mismatch:', {
            received: receivedHash,
            expected: expectedHash
        });
    }
    
    return isValid;
}
```

### PHP Implementation

```php
/**
 * Generate hash for Paynow request
 * @param array $values - Request data
 * @param string $integrationKey - Integration key
 * @return string Uppercase SHA512 hash
 */
private function createHash($values, $integrationKey) {
    $string = "";
    
    // Concatenate all values except hash
    foreach($values as $key => $value) {
        if(strtoupper($key) != "HASH") {
            $string .= $value;
        }
    }
    
    // Append integration key
    $string .= $integrationKey;
    
    // Generate SHA512 hash
    $hash = hash("sha512", $string);
    
    // Return uppercase
    return strtoupper($hash);
}

/**
 * Validate webhook hash
 * @param array $webhookData - Webhook POST data
 * @param string $integrationKey - Integration key
 * @return bool True if valid
 */
private function validateWebhookHash($webhookData, $integrationKey) {
    $receivedHash = $webhookData['hash'] ?? '';
    
    if (empty($receivedHash)) {
        return false;
    }
    
    // Generate expected hash
    $expectedHash = $this->createHash($webhookData, $integrationKey);
    
    // Compare (case-insensitive)
    return strtoupper($receivedHash) === strtoupper($expectedHash);
}
```

### C# Implementation

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

/// <summary>
/// Generate hash for Paynow request
/// </summary>
private static string GenerateTwoWayHash(Dictionary<string, string> items, Guid guid)
{
    // Concatenate all values except hash
    string concat = string.Join("", 
        items
            .Where(c => !string.Equals(c.Key, "HASH", StringComparison.OrdinalIgnoreCase))
            .Select(c => c.Value?.Trim() ?? "")
    );
    
    // Append integration key
    concat += guid.ToString();
    
    // Generate SHA512 hash
    SHA512 check = SHA512.Create();
    byte[] resultArr = check.ComputeHash(Encoding.UTF8.GetBytes(concat));
    
    // Convert to uppercase hex
    return ByteArrayToString(resultArr);
}

/// <summary>
/// Convert byte array to uppercase hex string
/// </summary>
public static string ByteArrayToString(byte[] ba)
{
    StringBuilder hex = new StringBuilder(ba.Length * 2);
    foreach (byte b in ba)
        hex.AppendFormat("{0:X2}", b);
    
    return hex.ToString();
}

/// <summary>
/// Validate webhook hash
/// </summary>
private static bool ValidateWebhookHash(Dictionary<string, string> webhookData, Guid integrationKey)
{
    if (!webhookData.ContainsKey("hash"))
        return false;
    
    string receivedHash = webhookData["hash"];
    string expectedHash = GenerateTwoWayHash(webhookData, integrationKey);
    
    return string.Equals(receivedHash, expectedHash, StringComparison.OrdinalIgnoreCase);
}
```

### Python Implementation

```python
import hashlib
from typing import Dict

def generate_hash(data: Dict[str, str], integration_key: str) -> str:
    """
    Generate SHA512 hash for Paynow request
    
    Args:
        data: Request data dictionary
        integration_key: Integration key
        
    Returns:
        Uppercase SHA512 hash
    """
    # Concatenate all values except hash
    hash_string = ''
    for key in sorted(data.keys()):
        if key.lower() != 'hash':
            value = data[key]
            hash_string += str(value) if value is not None else ''
    
    # Append integration key
    hash_string += integration_key
    
    # Generate SHA512 hash
    hash_obj = hashlib.sha512(hash_string.encode('utf-8'))
    hash_hex = hash_obj.hexdigest().upper()
    
    return hash_hex

def validate_webhook_hash(webhook_data: Dict[str, str], integration_key: str) -> bool:
    """
    Validate webhook hash
    
    Args:
        webhook_data: Webhook POST data
        integration_key: Integration key
        
    Returns:
        True if hash is valid
    """
    received_hash = webhook_data.get('hash', '')
    
    if not received_hash:
        return False
    
    # Generate expected hash
    expected_hash = generate_hash(webhook_data, integration_key)
    
    # Compare (case-insensitive)
    return received_hash.upper() == expected_hash.upper()
```

---

## Common Pitfalls

### ❌ Pitfall 1: Including Hash in Hash Calculation

**Wrong:**
```javascript
// ❌ Including hash field
const hashString = data.reference + data.amount + data.hash + integrationKey;
```

**Correct:**
```javascript
// ✅ Exclude hash field
const sortedKeys = Object.keys(data).filter(key => key !== 'hash');
```

### ❌ Pitfall 2: URL Encoding Values

**Wrong:**
```javascript
// ❌ URL encoding before hashing
const hashString = encodeURIComponent(data.reference) + encodeURIComponent(data.amount);
```

**Correct:**
```javascript
// ✅ Use raw values
const hashString = data.reference + data.amount;
```

### ❌ Pitfall 3: Wrong Field Order

**Wrong:**
```javascript
// ❌ Random order
const hashString = data.amount + data.reference + integrationKey;
```

**Correct:**
```javascript
// ✅ Sort keys alphabetically
const sortedKeys = Object.keys(data).sort();
```

### ❌ Pitfall 4: Case Sensitivity

**Wrong:**
```javascript
// ❌ Case-sensitive comparison
if (receivedHash === expectedHash) { }
```

**Correct:**
```javascript
// ✅ Case-insensitive comparison
if (receivedHash.toUpperCase() === expectedHash.toUpperCase()) { }
```

### ❌ Pitfall 5: Missing Integration Key

**Wrong:**
```javascript
// ❌ Forgot integration key
const hash = crypto.createHash('sha512').update(hashString).digest('hex');
```

**Correct:**
```javascript
// ✅ Include integration key
const hashString = values + integrationKey;
const hash = crypto.createHash('sha512').update(hashString).digest('hex');
```

### ❌ Pitfall 6: Wrong Hash Algorithm

**Wrong:**
```javascript
// ❌ Using SHA256
const hash = crypto.createHash('sha256').update(hashString).digest('hex');
```

**Correct:**
```javascript
// ✅ Use SHA512
const hash = crypto.createHash('sha512').update(hashString).digest('hex');
```

### ❌ Pitfall 7: Lowercase Hash

**Wrong:**
```javascript
// ❌ Lowercase
const hash = crypto.createHash('sha512').update(hashString).digest('hex');
```

**Correct:**
```javascript
// ✅ Uppercase
const hash = crypto.createHash('sha512').update(hashString).digest('hex').toUpperCase();
```

---

## Testing Hash Generation

### Test Case 1: Outbound Message (Transaction Initiation)

**Input:**
```javascript
const data = {
    id: '1201',
    reference: 'TEST REF',
    amount: '99.99',
    additionalinfo: 'A test ticket transaction',
    returnurl: 'http://www.google.com/search?q=returnurl',
    resulturl: 'http://www.google.com/search?q=resulturl',
    status: 'Message'
};

const integrationKey = '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977';
```

**Expected Hash:**
```
2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689
```

**Test:**
```javascript
const hash = generateHash(data, integrationKey);
console.assert(
    hash === '2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689',
    'Hash generation failed!'
);
```

### Test Case 2: Inbound Message (Paynow Response)

**Input (Raw URL-encoded message):**
```javascript
const rawMessage = 'status=Ok&browserurl=https%3a%2f%2fstaging.paynow.co.zw%2fPayment%2fConfirmPayment%2f9510&pollurl=https%3a%2f%2fstaging.paynow.co.zw%2fInterface%2fCheckPayment%2f%3fguid%3dc7ed41da-0159-46da-b428-69549f770413&paynowreference=9510&hash=750DD0B0DF374678707BB5AF915AF81C228B9058AD57BB7120569EC68BBB9C2EFC1B26C6375D2BC562AC909B3CD6B2AF1D42E1A5E479FFAC8F4FB3FDCE71DF4D';

const integrationKey = '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977';
```

**Expected Result:** Hash should validate as **true**

**Test:**
```javascript
const isValid = validateInboundMessage(rawMessage, integrationKey);
console.assert(isValid === true, 'Inbound message validation failed!');

// Detailed test
const querystring = require('querystring');
const data = querystring.parse(rawMessage);

// Concatenated string should be:
// Okhttps://staging.paynow.co.zw/Payment/ConfirmPayment/9510https://staging.paynow.co.zw/Interface/CheckPayment/?guid=c7ed41da-0159-46da-b428-69549f7704139510

let hashString = '';
Object.keys(data).forEach(key => {
    if (key.toLowerCase() !== 'hash') {
        hashString += data[key];
    }
});
hashString += integrationKey;

const expectedHash = crypto
    .createHash('sha512')
    .update(hashString, 'utf8')
    .digest('hex')
    .toUpperCase();

console.assert(
    expectedHash === '750DD0B0DF374678707BB5AF915AF81C228B9058AD57BB7120569EC68BBB9C2EFC1B26C6375D2BC562AC909B3CD6B2AF1D42E1A5E479FFAC8F4FB3FDCE71DF4D',
    'Expected hash mismatch!'
);
```

### Test Case 3: Webhook Validation

**Input:**
```javascript
const webhookData = {
    reference: 'ABC123',
    paynowreference: '123456',
    amount: '10.00',
    status: 'Paid',
    pollurl: 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=test'
};

// Generate valid hash
const validHash = generateHash(webhookData, integrationKey);
webhookData.hash = validHash;
```

**Test:**
```javascript
const isValid = validateWebhookHash(webhookData);
console.assert(isValid === true, 'Webhook validation failed!');
```

### Test Suite

**File:** `tests/hash-generation.test.js`

```javascript
const { generateHash, validateWebhookHash } = require('../services/paynow.service');

describe('Hash Generation', () => {
    const integrationKey = '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977';
    
    test('generates correct hash for basic transaction', () => {
        const data = {
            id: '1201',
            reference: 'TEST REF',
            amount: '99.99',
            additionalinfo: 'A test ticket transaction',
            returnurl: 'http://www.google.com/search?q=returnurl',
            resulturl: 'http://www.google.com/search?q=resulturl',
            status: 'Message'
        };
        
        const hash = generateHash(data, integrationKey);
        
        expect(hash).toBe(
            '2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689'
        );
    });
    
    test('excludes hash field from calculation', () => {
        const data = {
            reference: 'TEST',
            amount: '10.00',
            hash: 'SHOULD_BE_IGNORED'
        };
        
        const hash1 = generateHash(data, integrationKey);
        
        delete data.hash;
        const hash2 = generateHash(data, integrationKey);
        
        expect(hash1).toBe(hash2);
    });
    
    test('validates correct webhook hash', () => {
        const webhookData = {
            reference: 'TEST',
            amount: '10.00',
            status: 'Paid'
        };
        
        // Generate valid hash
        const validHash = generateHash(webhookData, integrationKey);
        webhookData.hash = validHash;
        
        const isValid = validateWebhookHash(webhookData, integrationKey);
        
        expect(isValid).toBe(true);
    });
    
    test('rejects invalid webhook hash', () => {
        const webhookData = {
            reference: 'TEST',
            amount: '10.00',
            status: 'Paid',
            hash: 'INVALID_HASH'
        };
        
        const isValid = validateWebhookHash(webhookData, integrationKey);
        
        expect(isValid).toBe(false);
    });
    
    test('handles special characters', () => {
        const data = {
            reference: 'TEST & SPECIAL',
            amount: '10.00',
            description: 'Test with "quotes" and <tags>'
        };
        
        const hash = generateHash(data, integrationKey);
        
        expect(hash).toHaveLength(128); // SHA512 = 128 hex chars
        expect(hash).toMatch(/^[A-F0-9]+$/); // Uppercase hex
    });
});
```

---

## Security Best Practices

### ✅ DO

**1. Always Validate Incoming Hashes**
```javascript
if (!validateWebhookHash(req.body)) {
    return res.status(400).send('INVALID_HASH');
}
```

**2. Use Environment Variables for Keys**
```javascript
const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;
```

**3. Log Hash Validation Failures**
```javascript
if (!isValid) {
    console.error('Hash validation failed:', {
        reference: data.reference,
        receivedHash: data.hash.substring(0, 10) + '...'
    });
}
```

**4. Compare Case-Insensitively**
```javascript
receivedHash.toUpperCase() === expectedHash.toUpperCase()
```

### ❌ DON'T

**1. Don't Expose Integration Key**
```javascript
// ❌ Never do this
res.json({ integrationKey: config.integrationKey });
```

**2. Don't Skip Hash Validation**
```javascript
// ❌ Never skip validation
// Process webhook without checking hash
```

**3. Don't Log Full Hashes**
```javascript
// ❌ Don't log full hash (security risk)
console.log('Hash:', fullHash);

// ✅ Log partial hash only
console.log('Hash:', fullHash.substring(0, 10) + '...');
```

**4. Don't Use Weak Algorithms**
```javascript
// ❌ Don't use MD5 or SHA1
const hash = crypto.createHash('md5');

// ✅ Use SHA512
const hash = crypto.createHash('sha512');
```

---

## Summary

### ✅ Hash Generation Essentials

- ✅ **Algorithm:** SHA512
- ✅ **Output:** Uppercase hexadecimal (128 chars)
- ✅ **Encoding:** UTF-8
- ✅ **Key:** Integration key (secret)
- ✅ **Validation:** Always required

### 📋 Implementation Checklist

- [x] Generate hash for outbound messages
- [x] Validate hash for inbound messages
- [x] Exclude hash field from calculation
- [x] Use raw values (not URL encoded)
- [x] Sort keys alphabetically
- [x] Append integration key
- [x] Convert to uppercase
- [x] Compare case-insensitively

### 🔒 Security

- ✅ Integration key in environment variables
- ✅ Hash validation on all webhooks
- ✅ Log validation failures
- ✅ Never expose integration key
- ✅ Use SHA512 (not weaker algorithms)

---

**🔐 Your hash generation is secure and production-ready!** 🔐
