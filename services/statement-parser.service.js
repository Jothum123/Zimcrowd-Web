/**
 * Statement Parser Service
 * Parses bank and EcoCash statements to extract financial metrics
 * for ZimScore calculation
 */

class StatementParserService {
    /**
     * Parse bank or EcoCash statement text
     * @param {string} rawText - OCR text from statement
     * @param {string} statementType - 'BANK_STATEMENT' or 'ECOCASH_STATEMENT'
     * @returns {Object} Parsed financial data
     */
    parseStatement(rawText, statementType = 'BANK_STATEMENT') {
        console.log(`📊 Parsing ${statementType}...`);
        
        if (!rawText || rawText.trim().length === 0) {
            return {
                success: false,
                error: 'Empty statement text'
            };
        }

        try {
            if (statementType === 'ECOCASH_STATEMENT') {
                return this.parseEcoCashStatement(rawText);
            } else {
                return this.parseBankStatement(rawText);
            }
        } catch (error) {
            console.error('❌ Statement parsing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Parse bank statement
     * @private
     */
    parseBankStatement(rawText) {
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // Extract transactions
        const transactions = this.extractBankTransactions(lines);
        
        if (transactions.length === 0) {
            return {
                success: false,
                error: 'No transactions found in statement'
            };
        }

        // Calculate metrics
        const metrics = this.calculateFinancialMetrics(transactions);
        
        // Extract account holder name
        const accountHolder = this.extractAccountHolder(lines);
        
        // Extract statement period
        const period = this.extractStatementPeriod(lines);

        console.log(`✅ Parsed ${transactions.length} transactions`);
        console.log(`   Avg Monthly Income: $${metrics.avgMonthlyIncome.toFixed(2)}`);
        console.log(`   Avg Ending Balance: $${metrics.avgEndingBalance.toFixed(2)}`);
        console.log(`   Cash Flow Ratio: ${metrics.cashFlowRatio}`);
        console.log(`   Balance Consistency: ${metrics.balanceConsistencyScore}/10`);
        console.log(`   NSF Events: ${metrics.nsfEvents}`);

        return {
            success: true,
            accountHolder,
            period,
            transactions,
            metrics: {
                avgMonthlyIncome: metrics.avgMonthlyIncome,
                avgEndingBalance: metrics.avgEndingBalance,
                nsfEvents: metrics.nsfEvents,
                totalCredits: metrics.totalCredits,
                totalDebits: metrics.totalDebits,
                transactionCount: transactions.length,
                largestDeposit: metrics.largestDeposit,
                largestWithdrawal: metrics.largestWithdrawal,
                cashFlowRatio: metrics.cashFlowRatio,
                balanceConsistencyScore: metrics.balanceConsistencyScore
            }
        };
    }

    /**
     * Parse EcoCash statement
     * @private
     */
    parseEcoCashStatement(rawText) {
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // Extract transactions
        const transactions = this.extractEcoCashTransactions(lines);
        
        if (transactions.length === 0) {
            return {
                success: false,
                error: 'No transactions found in EcoCash statement'
            };
        }

        // Calculate metrics
        const metrics = this.calculateFinancialMetrics(transactions);
        
        // Extract phone number
        const phoneNumber = this.extractPhoneNumber(lines);
        
        // Extract statement period
        const period = this.extractStatementPeriod(lines);

        console.log(`✅ Parsed ${transactions.length} EcoCash transactions`);
        console.log(`   Avg Monthly Income: $${metrics.avgMonthlyIncome.toFixed(2)}`);
        console.log(`   Avg Ending Balance: $${metrics.avgEndingBalance.toFixed(2)}`);
        console.log(`   Cash Flow Ratio: ${metrics.cashFlowRatio}`);
        console.log(`   Balance Consistency: ${metrics.balanceConsistencyScore}/10`);

        return {
            success: true,
            phoneNumber,
            period,
            transactions,
            metrics: {
                avgMonthlyIncome: metrics.avgMonthlyIncome,
                avgEndingBalance: metrics.avgEndingBalance,
                nsfEvents: metrics.nsfEvents,
                totalCredits: metrics.totalCredits,
                totalDebits: metrics.totalDebits,
                transactionCount: transactions.length,
                largestDeposit: metrics.largestDeposit,
                largestWithdrawal: metrics.largestWithdrawal,
                cashFlowRatio: metrics.cashFlowRatio,
                balanceConsistencyScore: metrics.balanceConsistencyScore
            }
        };
    }

    /**
     * Extract bank transactions from statement lines
     * @private
     */
    extractBankTransactions(lines) {
        const transactions = [];
        
        // Common bank statement patterns
        // Date | Description | Debit | Credit | Balance
        // or: Date Description Amount Balance
        
        const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/;
        const amountPattern = /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
        
        for (const line of lines) {
            const dateMatch = line.match(datePattern);
            if (!dateMatch) continue;
            
            // Extract all amounts from the line
            const amounts = [];
            let match;
            while ((match = amountPattern.exec(line)) !== null) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(amount)) {
                    amounts.push(amount);
                }
            }
            
            if (amounts.length >= 2) {
                // Typically: [debit/credit, balance] or [credit, debit, balance]
                const balance = amounts[amounts.length - 1];
                const transactionAmount = amounts[amounts.length - 2];
                
                // Determine if credit or debit based on context
                const isCredit = line.toLowerCase().includes('deposit') || 
                                line.toLowerCase().includes('credit') ||
                                line.toLowerCase().includes('transfer in');
                
                transactions.push({
                    date: dateMatch[1],
                    description: line.substring(dateMatch.index + dateMatch[0].length, line.indexOf(amounts[0])).trim(),
                    amount: transactionAmount,
                    balance: balance,
                    type: isCredit ? 'credit' : 'debit'
                });
            }
        }
        
        return transactions;
    }

    /**
     * Extract EcoCash transactions
     * @private
     */
    extractEcoCashTransactions(lines) {
        const transactions = [];
        
        // EcoCash format: Date, Type, Amount, Balance
        const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/;
        const amountPattern = /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
        
        for (const line of lines) {
            const dateMatch = line.match(datePattern);
            if (!dateMatch) continue;
            
            // Extract amounts
            const amounts = [];
            let match;
            while ((match = amountPattern.exec(line)) !== null) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(amount)) {
                    amounts.push(amount);
                }
            }
            
            if (amounts.length >= 2) {
                const transactionAmount = amounts[0];
                const balance = amounts[amounts.length - 1];
                
                // Determine transaction type
                const isCredit = line.toLowerCase().includes('received') || 
                                line.toLowerCase().includes('cash in') ||
                                line.toLowerCase().includes('deposit');
                
                transactions.push({
                    date: dateMatch[1],
                    description: line.substring(dateMatch.index + dateMatch[0].length).trim(),
                    amount: transactionAmount,
                    balance: balance,
                    type: isCredit ? 'credit' : 'debit'
                });
            }
        }
        
        return transactions;
    }

    /**
     * Calculate financial metrics from transactions
     * @private
     */
    calculateFinancialMetrics(transactions) {
        if (transactions.length === 0) {
            return {
                avgMonthlyIncome: 0,
                avgEndingBalance: 0,
                nsfEvents: 0,
                totalCredits: 0,
                totalDebits: 0,
                largestDeposit: 0,
                largestWithdrawal: 0,
                cashFlowRatio: 0,
                balanceConsistencyScore: 0
            };
        }

        // Calculate total credits (income)
        const credits = transactions.filter(t => t.type === 'credit');
        const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
        
        // Calculate total debits (expenses)
        const debits = transactions.filter(t => t.type === 'debit');
        const totalDebits = debits.reduce((sum, t) => sum + t.amount, 0);
        
        // Calculate cash flow ratio (income / expenses) - CRITICAL SPEC REQUIREMENT
        const cashFlowRatio = totalDebits > 0 ? totalCredits / totalDebits : 0;
        
        // Calculate average monthly income (assuming 3-month statement)
        const avgMonthlyIncome = totalCredits / 3;
        
        // Calculate average ending balance
        const balances = transactions.map(t => t.balance).filter(b => b > 0);
        const avgEndingBalance = balances.length > 0
            ? balances.reduce((sum, b) => sum + b, 0) / balances.length
            : 0;
        
        // Calculate balance consistency score (0-10)
        // Lower variance = higher consistency
        let balanceConsistencyScore = 0;
        if (balances.length > 1) {
            const mean = avgEndingBalance;
            const variance = balances.reduce((sum, b) => sum + Math.pow(b - mean, 2), 0) / balances.length;
            const stdDev = Math.sqrt(variance);
            const coefficientOfVariation = mean > 0 ? (stdDev / mean) : 1;
            
            // Convert to 0-10 scale (lower CV = higher score)
            // CV < 0.3 = excellent (10), CV > 1.0 = poor (0)
            balanceConsistencyScore = Math.max(0, Math.min(10, 10 - (coefficientOfVariation * 10)));
            balanceConsistencyScore = Math.round(balanceConsistencyScore);
        }
        
        // Count NSF (Non-Sufficient Funds) events
        // Negative balances or very low balances
        const nsfEvents = transactions.filter(t => t.balance < 0 || t.balance < 1).length;
        
        // Find largest transactions
        const largestDeposit = credits.length > 0
            ? Math.max(...credits.map(t => t.amount))
            : 0;
        const largestWithdrawal = debits.length > 0
            ? Math.max(...debits.map(t => t.amount))
            : 0;

        return {
            avgMonthlyIncome,
            avgEndingBalance,
            nsfEvents,
            totalCredits,
            totalDebits,
            largestDeposit,
            largestWithdrawal,
            cashFlowRatio: Math.round(cashFlowRatio * 100) / 100,
            balanceConsistencyScore
        };
    }

    /**
     * Extract account holder name
     * @private
     */
    extractAccountHolder(lines) {
        // Look for common patterns: "Account Holder:", "Name:", etc.
        const namePattern = /(?:Account Holder|Name|Customer)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i;
        
        for (const line of lines) {
            const match = line.match(namePattern);
            if (match) {
                return match[1].trim();
            }
        }
        
        return null;
    }

    /**
     * Extract phone number from EcoCash statement
     * @private
     */
    extractPhoneNumber(lines) {
        // Zim phone pattern: +263... or 0...
        const phonePattern = /(?:\+263|0)(?:71|73|77|78)\d{7}/;
        
        for (const line of lines) {
            const match = line.match(phonePattern);
            if (match) {
                return match[0];
            }
        }
        
        return null;
    }

    /**
     * Extract statement period
     * @private
     */
    extractStatementPeriod(lines) {
        // Look for date ranges
        const periodPattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i;
        
        for (const line of lines) {
            const match = line.match(periodPattern);
            if (match) {
                return {
                    from: match[1],
                    to: match[2]
                };
            }
        }
        
        return null;
    }

    /**
     * Validate statement data quality
     * @param {Object} parsedData - Parsed statement data
     * @returns {Object} Validation result
     */
    validateStatementData(parsedData) {
        const issues = [];
        
        if (!parsedData.success) {
            return {
                valid: false,
                issues: ['Statement parsing failed']
            };
        }

        // Check transaction count
        if (parsedData.metrics.transactionCount < 5) {
            issues.push('Too few transactions (minimum 5 required)');
        }

        // Check for reasonable income
        if (parsedData.metrics.avgMonthlyIncome < 10) {
            issues.push('Monthly income appears too low or not detected');
        }

        // Check for excessive NSF events
        if (parsedData.metrics.nsfEvents > 10) {
            issues.push('High number of insufficient funds events');
        }

        // Check balance reasonableness
        if (parsedData.metrics.avgEndingBalance < 0) {
            issues.push('Negative average balance detected');
        }

        return {
            valid: issues.length === 0,
            issues,
            quality: issues.length === 0 ? 'good' : issues.length <= 2 ? 'fair' : 'poor'
        };
    }
}

// Singleton instance
let parserServiceInstance = null;

function getStatementParser() {
    if (!parserServiceInstance) {
        parserServiceInstance = new StatementParserService();
    }
    return parserServiceInstance;
}

module.exports = {
    StatementParserService,
    getStatementParser
};
