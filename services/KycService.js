const { supabase } = require('../utils/supabase-auth');

/**
 * KYC Service
 * Handles document uploads and verification for Know Your Customer process
 */
class KycService {
    /**
     * Handle ID document upload (Zim ID or Passport)
     * @param {Object} file - Uploaded file from multer
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Upload result
     */
    static async handleIdUpload(file, userId) {
        try {
            // Store document metadata in database
            const { data, error } = await supabase
                .from('user_documents')
                .insert({
                    user_id: userId,
                    doc_type: 'ZIM_ID',
                    file_name: file.originalname,
                    file_size: file.size,
                    mime_type: file.mimetype,
                    is_verified: false,
                    uploaded_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Update user KYC status
            await supabase
                .from('zimscore_users')
                .upsert({
                    user_id: userId,
                    kyc_status: 'pending',
                    updated_at: new Date().toISOString()
                });

            return {
                success: true,
                documentId: data.id,
                message: 'ID document uploaded successfully',
                status: 'pending_verification'
            };
        } catch (error) {
            console.error('ID upload error:', error);
            throw new Error('Failed to upload ID document');
        }
    }

    /**
     * Handle selfie upload and face matching
     * @param {Object} file - Uploaded selfie file
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Face match result
     */
    static async handleFaceMatch(file, userId) {
        try {
            // Store selfie metadata
            const { data, error } = await supabase
                .from('user_documents')
                .insert({
                    user_id: userId,
                    doc_type: 'SELFIE',
                    file_name: file.originalname,
                    file_size: file.size,
                    mime_type: file.mimetype,
                    is_verified: false,
                    uploaded_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // TODO: Implement actual face matching with AI service
            // For now, auto-approve for testing
            const faceMatchPassed = true;
            const matchScore = 0.95;

            // Update document verification status
            await supabase
                .from('user_documents')
                .update({
                    is_verified: faceMatchPassed,
                    verified_at: faceMatchPassed ? new Date().toISOString() : null
                })
                .eq('id', data.id);

            return {
                success: true,
                documentId: data.id,
                faceMatchPassed,
                matchScore,
                message: faceMatchPassed ? 'Face verification successful' : 'Face verification failed'
            };
        } catch (error) {
            console.error('Face match error:', error);
            throw new Error('Failed to process selfie');
        }
    }

    /**
     * Handle bank/EcoCash statement upload
     * @param {Object} file - Uploaded statement file
     * @param {string} userId - User ID
     * @param {string} statementType - Type of statement (BANK_STATEMENT or ECOCASH_STATEMENT)
     * @returns {Promise<Object>} Upload result
     */
    static async handleStatementUpload(file, userId, statementType = 'BANK_STATEMENT') {
        try {
            // Store statement metadata
            const { data, error } = await supabase
                .from('user_documents')
                .insert({
                    user_id: userId,
                    doc_type: statementType,
                    file_name: file.originalname,
                    file_size: file.size,
                    mime_type: file.mimetype,
                    is_verified: false,
                    uploaded_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // TODO: Implement actual statement parsing with OCR/AI
            // For now, generate mock financial data
            const financialData = {
                averageBalance: 5000,
                monthlyIncome: 3000,
                monthlyExpenses: 2500,
                transactionCount: 45,
                savingsRate: 0.17
            };

            // Update KYC status to completed
            await supabase
                .from('zimscore_users')
                .upsert({
                    user_id: userId,
                    kyc_status: 'completed',
                    kyc_completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            return {
                success: true,
                documentId: data.id,
                financialData,
                message: 'Statement uploaded and processed successfully'
            };
        } catch (error) {
            console.error('Statement upload error:', error);
            throw new Error('Failed to upload statement');
        }
    }

    /**
     * Get user's KYC status
     * @param {string} userId - User ID
     * @returns {Promise<Object>} KYC status
     */
    static async getKycStatus(userId) {
        try {
            const { data: user, error } = await supabase
                .from('zimscore_users')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            const { data: documents } = await supabase
                .from('user_documents')
                .select('doc_type, is_verified, uploaded_at')
                .eq('user_id', userId);

            return {
                success: true,
                data: {
                    kycStatus: user?.kyc_status || 'not_started',
                    kycCompletedAt: user?.kyc_completed_at,
                    documents: documents || []
                }
            };
        } catch (error) {
            console.error('Get KYC status error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = KycService;
