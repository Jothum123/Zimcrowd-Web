/**
 * ZimScore Service - Vanilla Node.js Implementation
 * Uses raw PostgreSQL queries for all database operations
 * Score Range: 30-85 (internal) | 1.0-5.0 stars (public)
 */

const { dbPool } = require('../database');
const { parse } = require('./StatementParser');

// Score configuration
const SCORE_MIN = 30;
const SCORE_MAX = 85;

// Score weights for different factors
const WEIGHTS = {
    // Base score
    BASE_SCORE: 35,
    
    // Trust Loop factors (loan repayment behavior)
    LOAN_REPAID_ON_TIME: 2,
    LOAN_REPAID_EARLY: 3,
    LOAN_REPAID_LATE: -3,
    LOAN_DEFAULTED: -15,
    ACTIVE_LOAN_BONUS: 1,
    MULTIPLE_LOANS_BONUS: 5, // Bonus for 3+ successful loans
    
    // Cold Start factors (financial statements)
    AVG_MONTHLY_INCOME_PER_100: 0.1, // 0.1 points per $100 income
    AVG_BALANCE_PER_100: 0.05, // 0.05 points per $100 balance
    NSF_EVENT_PENALTY: -3, // -3 points per NSF event
    NO_NSF_BONUS: 5, // +5 points for zero NSF events
};

/**
 * Calculate the new ZimScore (30-85) for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Calculated score
 */
async function calculateNewZimScore(userId) {
    console.log(`🎯 Calculating ZimScore for user ${userId}...`);
    
    let newScore = WEIGHTS.BASE_SCORE;
    
    // ========================================
    // PART 1: TRUST LOOP (Loan Repayment Behavior)
    // ========================================
    
    const loanQuery = `
        SELECT status, due_date, repaid_at 
        FROM loans 
        WHERE borrower_user_id = $1
    `;
    
    const loanResult = await dbPool.query(loanQuery, [userId]);
    const userLoans = loanResult.rows;
    
    let onTimeCount = 0;
    let earlyCount = 0;
    let lateCount = 0;
    let defaultCount = 0;
    let activeCount = 0;
    
    for (const loan of userLoans) {
        if (loan.status === 'repaid') {
            const dueDate = new Date(loan.due_date);
            const repaidDate = new Date(loan.repaid_at);
            
            if (repaidDate <= dueDate) {
                // Repaid on time or early
                if (repaidDate < dueDate) {
                    earlyCount++;
                    newScore += WEIGHTS.LOAN_REPAID_EARLY;
                } else {
                    onTimeCount++;
                    newScore += WEIGHTS.LOAN_REPAID_ON_TIME;
                }
            } else {
                // Repaid late
                lateCount++;
                newScore += WEIGHTS.LOAN_REPAID_LATE;
            }
        } else if (loan.status === 'late') {
            lateCount++;
            newScore += WEIGHTS.LOAN_REPAID_LATE;
        } else if (loan.status === 'default') {
            defaultCount++;
            newScore += WEIGHTS.LOAN_DEFAULTED;
        } else if (loan.status === 'funded') {
            activeCount++;
            newScore += WEIGHTS.ACTIVE_LOAN_BONUS;
        }
    }
    
    // Bonus for multiple successful loans
    const successfulLoans = onTimeCount + earlyCount;
    if (successfulLoans >= 3) {
        newScore += WEIGHTS.MULTIPLE_LOANS_BONUS;
    }
    
    console.log(`  Trust Loop: ${successfulLoans} successful, ${lateCount} late, ${defaultCount} defaulted`);
    
    // ========================================
    // PART 2: COLD START (Financial Statements)
    // ========================================
    
    // Only use Cold Start data if user has no loan history
    if (userLoans.length === 0) {
        console.log('  Using Cold Start data (no loan history)...');
        
        const docQuery = `
            SELECT ocr_raw_text, extracted_data 
            FROM user_documents 
            WHERE user_id = $1 
              AND doc_type IN ('BANK_STATEMENT', 'ECOCASH_STATEMENT')
              AND is_verified = true
            ORDER BY uploaded_at DESC
            LIMIT 1
        `;
        
        const docResult = await dbPool.query(docQuery, [userId]);
        const statementDoc = docResult.rows[0];
        
        if (statementDoc) {
            let bankData;
            
            // Try to use extracted_data first (already parsed)
            if (statementDoc.extracted_data) {
                bankData = typeof statementDoc.extracted_data === 'string' 
                    ? JSON.parse(statementDoc.extracted_data)
                    : statementDoc.extracted_data;
            } else if (statementDoc.ocr_raw_text) {
                // Parse raw OCR text
                bankData = parse(statementDoc.ocr_raw_text);
            }
            
            if (bankData) {
                // Income factor
                const incomePoints = (bankData.avgMonthlyIncome / 100) * WEIGHTS.AVG_MONTHLY_INCOME_PER_100;
                newScore += incomePoints;
                
                // Balance factor
                const balancePoints = (bankData.avgEndingBalance / 100) * WEIGHTS.AVG_BALANCE_PER_100;
                newScore += balancePoints;
                
                // NSF events factor
                if (bankData.nsfEvents === 0) {
                    newScore += WEIGHTS.NO_NSF_BONUS;
                } else {
                    newScore += bankData.nsfEvents * WEIGHTS.NSF_EVENT_PENALTY;
                }
                
                console.log(`  Financial Data: Income=$${bankData.avgMonthlyIncome}, Balance=$${bankData.avgEndingBalance}, NSF=${bankData.nsfEvents}`);
                console.log(`  Cold Start Points: Income=+${incomePoints.toFixed(1)}, Balance=+${balancePoints.toFixed(1)}, NSF=${bankData.nsfEvents * WEIGHTS.NSF_EVENT_PENALTY}`);
            }
        }
    }
    
    // ========================================
    // PART 3: CAP THE SCORE
    // ========================================
    
    if (newScore > SCORE_MAX) newScore = SCORE_MAX;
    if (newScore < SCORE_MIN) newScore = SCORE_MIN;
    
    const finalScore = Math.round(newScore);
    console.log(`✅ Final Score: ${finalScore}/${SCORE_MAX}`);
    
    return finalScore;
}

/**
 * Map internal score (30-85) to public star rating (1.0-5.0)
 * @param {number} score - Internal score value
 * @returns {number} Star rating (1.0-5.0 in 0.5 increments)
 */
function mapScoreToStars(score) {
    const scoreRange = SCORE_MAX - SCORE_MIN; // 55
    const starRange = 5.0 - 1.0; // 4.0
    const normalizedScore = (score - SCORE_MIN) / scoreRange; // 0.0 to 1.0
    const starValue = 1.0 + (normalizedScore * starRange); // 1.0 to 5.0
    
    // Round to nearest 0.5
    const rounded = Math.round(starValue * 2) / 2;
    
    // Clamp to valid range
    return Math.max(1.0, Math.min(5.0, rounded));
}

/**
 * Calculate maximum loan amount based on score
 * @param {number} score - Internal score value
 * @returns {number} Maximum loan amount in USD
 */
function getLimitForScore(score) {
    if (score >= 80) return 500.00;  // ~5.0 stars
    if (score >= 70) return 300.00;  // ~4.0 stars
    if (score >= 60) return 200.00;  // ~3.0 stars
    if (score >= 50) return 100.00;  // ~2.0 stars
    return 50.00;                    // 1.0-1.5 stars
}

/**
 * Main public function: Calculate score and save to database
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Score calculation result
 */
async function updateZimScoreInDB(userId) {
    console.log(`🔄 Updating ZimScore in database for user ${userId}...`);
    
    try {
        // 1. Calculate new score
        const newScore = await calculateNewZimScore(userId);
        const newStars = mapScoreToStars(newScore);
        const newLimit = getLimitForScore(newScore);
        
        // 2. Use UPSERT (INSERT ON CONFLICT) to save score
        const upsertQuery = `
            INSERT INTO user_zimscores (user_id, score_value, star_rating, max_loan_amount, last_calculated)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                score_value = EXCLUDED.score_value,
                star_rating = EXCLUDED.star_rating,
                max_loan_amount = EXCLUDED.max_loan_amount,
                last_calculated = NOW()
            RETURNING id, score_value, star_rating, max_loan_amount
        `;
        
        const result = await dbPool.query(upsertQuery, [userId, newScore, newStars, newLimit]);
        const savedScore = result.rows[0];
        
        console.log(`✅ ZimScore updated: ${newScore}/85 (${newStars}⭐) - Max Loan: $${newLimit}`);
        
        return {
            success: true,
            scoreValue: savedScore.score_value,
            starRating: savedScore.star_rating,
            maxLoanAmount: parseFloat(savedScore.max_loan_amount)
        };
        
    } catch (error) {
        console.error('❌ Failed to update ZimScore:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get user's current ZimScore
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Current score data
 */
async function getUserScore(userId) {
    try {
        const query = `
            SELECT score_value, star_rating, max_loan_amount, last_calculated
            FROM user_zimscores
            WHERE user_id = $1
        `;
        
        const result = await dbPool.query(query, [userId]);
        
        if (result.rows.length === 0) {
            return {
                success: false,
                message: 'ZimScore not found. Please complete KYC first.'
            };
        }
        
        return {
            success: true,
            data: result.rows[0]
        };
        
    } catch (error) {
        console.error('Error getting user score:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get public star rating for a user (for display to lenders)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Public star rating
 */
async function getPublicStarRating(userId) {
    try {
        const query = `
            SELECT star_rating, last_calculated
            FROM user_zimscores
            WHERE user_id = $1
        `;
        
        const result = await dbPool.query(query, [userId]);
        
        if (result.rows.length === 0) {
            return {
                success: false,
                message: 'ZimScore not found'
            };
        }
        
        return {
            success: true,
            starRating: result.rows[0].star_rating,
            lastCalculated: result.rows[0].last_calculated
        };
        
    } catch (error) {
        console.error('Error getting public star rating:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    updateZimScoreInDB,
    calculateNewZimScore,
    mapScoreToStars,
    getLimitForScore,
    getUserScore,
    getPublicStarRating
};
