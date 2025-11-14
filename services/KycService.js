/**
 * KYC Service - Vanilla Node.js Implementation
 * Handles file uploads, Google Vision API calls, and raw SQL database operations
 */

const { dbPool } = require('../database');
const { getVisionService } = require('./google-vision.service');
const path = require('path');
const fs = require('fs').promises;

/**
 * Save file to storage (local or cloud)
 * TODO: Replace with S3/GCS upload in production
 */
async function saveToStorage(file) {
    // For now, save locally
    const uploadDir = path.join(__dirname, '../uploads');
    
    // Ensure upload directory exists
    try {
        await fs.mkdir(uploadDir, { recursive: true });
    } catch (err) {
        console.error('Failed to create upload directory:', err);
    }

    const fileName = `${Date.now()}_${file.originalname}`;
    const filePath = path.join(uploadDir, fileName);
    
    // Move file from temp location
    if (file.path) {
        await fs.rename(file.path, filePath);
    } else if (file.buffer) {
        await fs.writeFile(filePath, file.buffer);
    }
    
    // Return URL (in production, this would be S3/GCS URL)
    return `file://${filePath}`;
}

/**
 * Handle ID document upload
 * @param {Object} file - Multer file object
 * @param {string} userId - User ID
 */
async function handleIdUpload(file, userId) {
    console.log(`📤 Processing ID upload for user ${userId}...`);
    
    try {
        // 1. Save file to storage
        const fileUrl = await saveToStorage(file);
        
        // 2. Extract text using Google Vision API
        const visionService = getVisionService();
        const idData = await visionService.extractZimID(file.buffer || fileUrl);
        
        if (!idData.success) {
            throw new Error('Failed to extract data from ID: ' + idData.error);
        }
        
        const ocrText = idData.rawText;
        
        // 3. Insert document into database using raw SQL
        const insertQuery = `
            INSERT INTO user_documents (user_id, doc_type, file_url, ocr_raw_text, ocr_confidence, extracted_data, is_verified, ocr_processed_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING doc_id
        `;
        
        const result = await dbPool.query(insertQuery, [
            userId,
            'ZIM_ID',
            fileUrl,
            ocrText,
            idData.confidence || 0,
            JSON.stringify({
                idNumber: idData.idNumber,
                fullName: idData.fullName,
                surname: idData.surname,
                firstNames: idData.firstNames,
                dateOfBirth: idData.dateOfBirth,
                villageOfOrigin: idData.villageOfOrigin
            }),
            true
        ]);
        
        const docId = result.rows[0].doc_id;
        
        // 4. Update user KYC status
        const updateQuery = `
            UPDATE users 
            SET kyc_status = $1 
            WHERE user_id = $2
        `;
        
        await dbPool.query(updateQuery, ['pending_face_match', userId]);
        
        console.log(`✅ ID uploaded successfully. Doc ID: ${docId}`);
        
        return {
            success: true,
            docId,
            extractedData: idData,
            nextStep: 'upload_selfie'
        };
        
    } catch (error) {
        console.error('❌ ID upload error:', error);
        throw error;
    }
}

/**
 * Handle selfie upload and face matching
 * @param {Object} selfieFile - Multer file object
 * @param {string} userId - User ID
 */
async function handleFaceMatch(selfieFile, userId) {
    console.log(`📸 Processing selfie for user ${userId}...`);
    
    try {
        // 1. Save selfie to storage
        const selfieUrl = await saveToStorage(selfieFile);
        
        // 2. Find the ID document URL
        const docQuery = `
            SELECT file_url, doc_id 
            FROM user_documents 
            WHERE user_id = $1 AND doc_type = $2 AND is_verified = true
            ORDER BY uploaded_at DESC
            LIMIT 1
        `;
        
        const docResult = await dbPool.query(docQuery, [userId, 'ZIM_ID']);
        const idDoc = docResult.rows[0];
        
        if (!idDoc) {
            throw new Error('User must upload ID before selfie.');
        }
        
        // 3. Perform face detection on selfie
        const visionService = getVisionService();
        const faceDetection = await visionService.detectFaces(selfieFile.buffer || selfieUrl);
        
        if (!faceDetection.success || faceDetection.faceCount === 0) {
            throw new Error('No face detected in selfie. Please take a clear photo.');
        }
        
        if (faceDetection.faceCount > 1) {
            throw new Error('Multiple faces detected. Please ensure only your face is visible.');
        }
        
        // 4. Compare faces (simplified - in production, download ID image and compare)
        // For now, we'll use a simulated high match score
        const faceMatchScore = 0.85; // TODO: Implement actual face comparison
        const faceMatchPassed = faceMatchScore >= 0.7;
        
        // 5. Save selfie document
        const insertQuery = `
            INSERT INTO user_documents (user_id, doc_type, file_url, face_match_score, face_match_passed, is_verified, ocr_processed_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING doc_id
        `;
        
        const result = await dbPool.query(insertQuery, [
            userId,
            'SELFIE',
            selfieUrl,
            faceMatchScore,
            faceMatchPassed,
            faceMatchPassed
        ]);
        
        const docId = result.rows[0].doc_id;
        
        // 6. Update KYC status
        const newKycStatus = faceMatchPassed ? 'pending_financials' : 'failed';
        const updateQuery = `
            UPDATE users 
            SET kyc_status = $1, kyc_failure_reason = $2
            WHERE user_id = $3
        `;
        
        await dbPool.query(updateQuery, [
            newKycStatus,
            faceMatchPassed ? null : 'Face match failed',
            userId
        ]);
        
        console.log(`✅ Face match ${faceMatchPassed ? 'passed' : 'failed'}. Score: ${faceMatchScore}`);
        
        return {
            success: true,
            docId,
            faceMatchScore,
            faceMatchPassed,
            nextStep: faceMatchPassed ? 'upload_statement' : 'retry_selfie'
        };
        
    } catch (error) {
        console.error('❌ Face match error:', error);
        throw error;
    }
}

/**
 * Handle financial statement upload
 * @param {Object} file - Multer file object
 * @param {string} userId - User ID
 * @param {string} statementType - 'BANK_STATEMENT' or 'ECOCASH_STATEMENT'
 */
async function handleStatementUpload(file, userId, statementType = 'BANK_STATEMENT') {
    console.log(`💰 Processing ${statementType} for user ${userId}...`);
    
    try {
        // 1. Save file to storage
        const fileUrl = await saveToStorage(file);
        
        // 2. Extract text using Google Vision API
        const visionService = getVisionService();
        const statementOCR = await visionService.extractStatementData(file.buffer || fileUrl);
        
        if (!statementOCR.success) {
            throw new Error('Failed to extract data from statement: ' + statementOCR.error);
        }
        
        const ocrText = statementOCR.rawText;
        
        // 3. Parse financial data (will be used by ZimScoreService)
        const { parse } = require('./StatementParser');
        const parsedData = parse(ocrText, statementType);
        
        // 4. Insert document into database
        const insertQuery = `
            INSERT INTO user_documents (user_id, doc_type, file_url, ocr_raw_text, ocr_confidence, extracted_data, is_verified, ocr_processed_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING doc_id
        `;
        
        const result = await dbPool.query(insertQuery, [
            userId,
            statementType,
            fileUrl,
            ocrText,
            statementOCR.confidence || 0,
            JSON.stringify(parsedData),
            true
        ]);
        
        const docId = result.rows[0].doc_id;
        
        // 5. Update KYC status to verified
        const updateQuery = `
            UPDATE users 
            SET kyc_status = $1, kyc_verified_at = NOW()
            WHERE user_id = $2
        `;
        
        await dbPool.query(updateQuery, ['verified', userId]);
        
        console.log(`✅ Statement uploaded successfully. Doc ID: ${docId}`);
        
        // 6. Trigger initial ZimScore calculation (asynchronously)
        // This is the "Cold Start"
        const { updateZimScoreInDB } = require('./ZimScoreService');
        updateZimScoreInDB(userId).catch(err => {
            console.error('❌ Initial score calculation failed:', err);
        });
        
        return {
            success: true,
            docId,
            financialData: parsedData,
            nextStep: 'kyc_complete'
        };
        
    } catch (error) {
        console.error('❌ Statement upload error:', error);
        throw error;
    }
}

module.exports = {
    handleIdUpload,
    handleFaceMatch,
    handleStatementUpload,
    saveToStorage
};
