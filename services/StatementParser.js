/**
 * Statement Parser Service - Enhanced Version
 * Parses raw OCR text from bank and EcoCash statements
 * into structured financial data for ZimScore calculation
 */

/**
 * @typedef {Object} ParsedFinancials
 * @property {number} avgMonthlyIncome - Average monthly income
 * @property {number} avgEndingBalance - Average ending balance
 * @property {number} nsfEvents - Number of insufficient funds events
 * @property {number} totalCredits - Total credit transactions
 * @property {number} totalDebits - Total debit transactions
 * @property {number} transactionCount - Total number of transactions
 */

/**
 * Parse bank or EcoCash statement text
 * @param {string} ocrText - Raw OCR text from Google Vision API
 * @param {string} statementType - 'BANK_STATEMENT' or 'ECOCASH_STATEMENT'
 * @returns {ParsedFinancials} Structured financial data
 */
function parse(ocrText, statementType = 'BANK_STATEMENT') {
    console.log(`📊 Parsing ${statementType}...`);
    
    if (!ocrText || ocrText.trim().length === 0) {
        console.warn('⚠️ Empty OCR text provided');
        return getDefaultFinancials();
    }
    
    try {
        if (statementType === 'ECOCASH_STATEMENT') {
            return parseEcoCashStatement(ocrText);
        } else {
            return parseBankStatement(ocrText);
        }
    } catch (error) {
        console.error('❌ Statement parsing error:', error);
        return getDefaultFinancials();
    }
}

/**
 * Parse bank statement
 * @private
 */
function parseBankStatement(ocrText) {
    const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let totalIncome = 0;
    let incomeEvents = 0;
    let totalDebits = 0;
    let debitEvents = 0;
    let balances = [];
    let nsfEvents = 0;
    let transactionCount = 0;
    
    // Enhanced regex patterns for Zimbabwean bank statements
    
    // Date patterns (various formats)
    const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/;
    
    // Amount patterns (with or without currency symbols, with commas)
    const amountPattern = /(?:USD|ZWL|[$]|ZW\$)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    
    // Income/Credit keywords
    const incomeKeywords = [
        'salary', 'credit', 'deposit', 'transfer in', 'received',
        'payment received', 'incoming', 'cr', 'reversal'
    ];
    
    // Debit keywords
    const debitKeywords = [
        'debit', 'withdrawal', 'transfer out', 'payment', 'purchase',
        'dr', 'fee', 'charge', 'atm'
    ];
    
    // NSF (Non-Sufficient Funds) keywords
    const nsfKeywords = [
        'nsf', 'insufficient', 'bounced', 'unpaid', 'r/d', 'returned',
        'dishonoured', 'refer to drawer', 'insufficient funds'
    ];
    
    // Balance keywords
    const balanceKeywords = [
        'balance', 'closing balance', 'end balance', 'available balance',
        'bal', 'closing bal'
    ];
    
    for (const line of lines) {
        const lowerLine = line.toLowerCase();
        
        // Check for NSF events
        if (nsfKeywords.some(keyword => lowerLine.includes(keyword))) {
            nsfEvents++;
        }
        
        // Check if line contains a date (likely a transaction)
        if (!datePattern.test(line)) {
            continue;
        }
        
        // Extract all amounts from the line
        const amounts = [];
        let match;
        const amountRegex = new RegExp(amountPattern);
        while ((match = amountRegex.exec(line)) !== null) {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(amount) && amount > 0) {
                amounts.push(amount);
            }
        }
        
        if (amounts.length === 0) continue;
        
        transactionCount++;
        
        // Determine if this is a credit or debit transaction
        const isCredit = incomeKeywords.some(keyword => lowerLine.includes(keyword));
        const isDebit = debitKeywords.some(keyword => lowerLine.includes(keyword));
        
        // Extract balance (usually the last amount in the line)
        const balance = amounts[amounts.length - 1];
        if (balance >= 0) {
            balances.push(balance);
        }
        
        // Extract transaction amount (usually second-to-last or first)
        const transactionAmount = amounts.length > 1 ? amounts[amounts.length - 2] : amounts[0];
        
        if (isCredit) {
            totalIncome += transactionAmount;
            incomeEvents++;
        } else if (isDebit || !isCredit) {
            // Default to debit if unclear
            totalDebits += transactionAmount;
            debitEvents++;
        }
    }
    
    // Calculate averages
    const avgMonthlyIncome = incomeEvents > 0 ? totalIncome / 3 : 0; // Assuming 3-month statement
    const avgEndingBalance = balances.length > 0 
        ? balances.reduce((sum, b) => sum + b, 0) / balances.length 
        : 0;
    
    console.log(`✅ Parsed bank statement: ${transactionCount} transactions, ${incomeEvents} credits, ${debitEvents} debits`);
    console.log(`   Avg Monthly Income: $${avgMonthlyIncome.toFixed(2)}`);
    console.log(`   Avg Balance: $${avgEndingBalance.toFixed(2)}`);
    console.log(`   NSF Events: ${nsfEvents}`);
    
    return {
        avgMonthlyIncome: Math.round(avgMonthlyIncome * 100) / 100,
        avgEndingBalance: Math.round(avgEndingBalance * 100) / 100,
        nsfEvents,
        totalCredits: Math.round(totalIncome * 100) / 100,
        totalDebits: Math.round(totalDebits * 100) / 100,
        transactionCount
    };
}

/**
 * Parse EcoCash statement
 * @private
 */
function parseEcoCashStatement(ocrText) {
    const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let totalIncome = 0;
    let incomeEvents = 0;
    let totalDebits = 0;
    let debitEvents = 0;
    let balances = [];
    let nsfEvents = 0;
    let transactionCount = 0;
    
    // EcoCash-specific patterns
    const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/;
    const amountPattern = /(?:USD|ZWL|[$]|ZW\$)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    
    // EcoCash transaction types
    const incomeKeywords = [
        'received', 'cash in', 'deposit', 'transfer in', 'airtime received',
        'merchant payment received', 'bill payment received'
    ];
    
    const debitKeywords = [
        'sent', 'cash out', 'withdrawal', 'transfer out', 'airtime purchase',
        'merchant payment', 'bill payment', 'ecocash charges'
    ];
    
    const nsfKeywords = [
        'failed', 'insufficient', 'declined', 'unsuccessful'
    ];
    
    for (const line of lines) {
        const lowerLine = line.toLowerCase();
        
        // Check for failed transactions
        if (nsfKeywords.some(keyword => lowerLine.includes(keyword))) {
            nsfEvents++;
        }
        
        // Check if line contains a date
        if (!datePattern.test(line)) {
            continue;
        }
        
        // Extract amounts
        const amounts = [];
        let match;
        const amountRegex = new RegExp(amountPattern);
        while ((match = amountRegex.exec(line)) !== null) {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(amount) && amount > 0) {
                amounts.push(amount);
            }
        }
        
        if (amounts.length === 0) continue;
        
        transactionCount++;
        
        // Determine transaction type
        const isCredit = incomeKeywords.some(keyword => lowerLine.includes(keyword));
        const isDebit = debitKeywords.some(keyword => lowerLine.includes(keyword));
        
        // Balance is typically the last amount
        const balance = amounts[amounts.length - 1];
        if (balance >= 0) {
            balances.push(balance);
        }
        
        // Transaction amount
        const transactionAmount = amounts.length > 1 ? amounts[0] : amounts[0];
        
        if (isCredit) {
            totalIncome += transactionAmount;
            incomeEvents++;
        } else if (isDebit) {
            totalDebits += transactionAmount;
            debitEvents++;
        }
    }
    
    // Calculate averages
    const avgMonthlyIncome = incomeEvents > 0 ? totalIncome / 3 : 0;
    const avgEndingBalance = balances.length > 0 
        ? balances.reduce((sum, b) => sum + b, 0) / balances.length 
        : 0;
    
    console.log(`✅ Parsed EcoCash statement: ${transactionCount} transactions`);
    console.log(`   Avg Monthly Income: $${avgMonthlyIncome.toFixed(2)}`);
    console.log(`   Avg Balance: $${avgEndingBalance.toFixed(2)}`);
    console.log(`   NSF Events: ${nsfEvents}`);
    
    return {
        avgMonthlyIncome: Math.round(avgMonthlyIncome * 100) / 100,
        avgEndingBalance: Math.round(avgEndingBalance * 100) / 100,
        nsfEvents,
        totalCredits: Math.round(totalIncome * 100) / 100,
        totalDebits: Math.round(totalDebits * 100) / 100,
        transactionCount
    };
}

/**
 * Get default financial data (fallback)
 * @private
 */
function getDefaultFinancials() {
    return {
        avgMonthlyIncome: 0,
        avgEndingBalance: 0,
        nsfEvents: 0,
        totalCredits: 0,
        totalDebits: 0,
        transactionCount: 0
    };
}

/**
 * Validate parsed financial data
 * @param {ParsedFinancials} data - Parsed financial data
 * @returns {Object} Validation result
 */
function validateFinancialData(data) {
    const issues = [];
    
    if (data.transactionCount < 5) {
        issues.push('Too few transactions detected (minimum 5 required)');
    }
    
    if (data.avgMonthlyIncome < 10) {
        issues.push('Monthly income appears too low or not detected');
    }
    
    if (data.nsfEvents > 10) {
        issues.push('High number of insufficient funds events');
    }
    
    if (data.avgEndingBalance < 0) {
        issues.push('Negative average balance detected');
    }
    
    return {
        valid: issues.length === 0,
        issues,
        quality: issues.length === 0 ? 'good' : issues.length <= 2 ? 'fair' : 'poor'
    };
}

module.exports = { 
    parse,
    validateFinancialData
};
