// Storage routes for file uploads (avatars, documents, etc.)
const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase-auth');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        // Allow images and PDFs
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and PDF are allowed.'));
        }
    }
});

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ success: false, message: 'Authentication failed' });
    }
};

// ============================================
// UPLOAD AVATAR
// ============================================
router.post('/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const userId = req.user.id;
        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}/avatar.${fileExt}`;

        // Delete existing avatar if any
        await supabase.storage
            .from('avatars')
            .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.gif`, `${userId}/avatar.webp`]);

        // Upload new avatar
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) {
            console.error('Avatar upload error:', error);
            return res.status(500).json({ success: false, message: 'Failed to upload avatar' });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        const avatarUrl = urlData.publicUrl;

        // Update profile with new avatar URL
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Profile update error:', updateError);
        }

        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            data: {
                url: avatarUrl,
                path: data.path
            }
        });

    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload avatar' });
    }
});

// ============================================
// GET AVATAR URL
// ============================================
router.get('/avatar/:userId?', async (req, res) => {
    try {
        const userId = req.params.userId || req.user?.id;
        
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID required' });
        }

        // Try to find avatar with different extensions
        const extensions = ['jpg', 'png', 'gif', 'webp'];
        let avatarUrl = null;

        for (const ext of extensions) {
            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(`${userId}/avatar.${ext}`);
            
            // Check if file exists by making a HEAD request
            try {
                const response = await fetch(data.publicUrl, { method: 'HEAD' });
                if (response.ok) {
                    avatarUrl = data.publicUrl;
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        res.json({
            success: true,
            data: { url: avatarUrl }
        });

    } catch (error) {
        console.error('Get avatar error:', error);
        res.status(500).json({ success: false, message: 'Failed to get avatar' });
    }
});

// ============================================
// DELETE AVATAR
// ============================================
router.delete('/avatar', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Delete all possible avatar files
        const { error } = await supabase.storage
            .from('avatars')
            .remove([
                `${userId}/avatar.jpg`,
                `${userId}/avatar.png`,
                `${userId}/avatar.gif`,
                `${userId}/avatar.webp`
            ]);

        if (error) {
            console.error('Avatar delete error:', error);
        }

        // Update profile to remove avatar URL
        await supabase
            .from('profiles')
            .update({ 
                avatar_url: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        res.json({
            success: true,
            message: 'Avatar deleted successfully'
        });

    } catch (error) {
        console.error('Avatar delete error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete avatar' });
    }
});

// ============================================
// UPLOAD KYC DOCUMENT
// ============================================
router.post('/kyc-document', verifyToken, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const userId = req.user.id;
        const file = req.file;
        const docType = req.body.documentType || 'general'; // e.g., 'id_front', 'id_back', 'selfie', 'proof_of_address'
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}/${docType}_${Date.now()}.${fileExt}`;

        // Upload document
        const { data, error } = await supabase.storage
            .from('kyc-documents')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('KYC document upload error:', error);
            return res.status(500).json({ success: false, message: 'Failed to upload document' });
        }

        // Create signed URL (valid for 1 hour)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('kyc-documents')
            .createSignedUrl(fileName, 3600);

        // Save document reference in database
        const { error: dbError } = await supabase
            .from('user_documents')
            .insert({
                user_id: userId,
                document_type: docType,
                file_path: data.path,
                file_name: file.originalname,
                mime_type: file.mimetype,
                file_size: file.size,
                status: 'pending',
                created_at: new Date().toISOString()
            });

        if (dbError) {
            console.error('KYC document DB error:', dbError);
            // Continue anyway - file is uploaded
        }

        res.json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                path: data.path,
                signedUrl: signedUrlData?.signedUrl,
                documentType: docType
            }
        });

    } catch (error) {
        console.error('KYC document upload error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload document' });
    }
});

// ============================================
// GET KYC DOCUMENTS LIST
// ============================================
router.get('/kyc-documents', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get documents from database
        const { data: documents, error } = await supabase
            .from('user_documents')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get KYC documents error:', error);
            return res.status(500).json({ success: false, message: 'Failed to get documents' });
        }

        // Generate signed URLs for each document
        const documentsWithUrls = await Promise.all(
            (documents || []).map(async (doc) => {
                const { data: signedUrlData } = await supabase.storage
                    .from('kyc-documents')
                    .createSignedUrl(doc.file_path, 3600);
                
                return {
                    ...doc,
                    signedUrl: signedUrlData?.signedUrl
                };
            })
        );

        res.json({
            success: true,
            data: documentsWithUrls
        });

    } catch (error) {
        console.error('Get KYC documents error:', error);
        res.status(500).json({ success: false, message: 'Failed to get documents' });
    }
});

// ============================================
// DELETE KYC DOCUMENT
// ============================================
router.delete('/kyc-document/:documentId', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const documentId = req.params.documentId;

        // Get document info
        const { data: doc, error: fetchError } = await supabase
            .from('user_documents')
            .select('*')
            .eq('id', documentId)
            .eq('user_id', userId)
            .single();

        if (fetchError || !doc) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('kyc-documents')
            .remove([doc.file_path]);

        if (storageError) {
            console.error('Storage delete error:', storageError);
        }

        // Delete from database
        const { error: dbError } = await supabase
            .from('user_documents')
            .delete()
            .eq('id', documentId);

        if (dbError) {
            console.error('DB delete error:', dbError);
            return res.status(500).json({ success: false, message: 'Failed to delete document' });
        }

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (error) {
        console.error('Delete KYC document error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete document' });
    }
});

// ============================================
// UPLOAD GENERAL USER DOCUMENT
// ============================================
router.post('/document', verifyToken, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const userId = req.user.id;
        const file = req.file;
        const category = req.body.category || 'general';
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}/${category}/${Date.now()}_${file.originalname}`;

        // Upload document
        const { data, error } = await supabase.storage
            .from('user-documents')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Document upload error:', error);
            return res.status(500).json({ success: false, message: 'Failed to upload document' });
        }

        // Create signed URL
        const { data: signedUrlData } = await supabase.storage
            .from('user-documents')
            .createSignedUrl(fileName, 3600);

        res.json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                path: data.path,
                signedUrl: signedUrlData?.signedUrl,
                fileName: file.originalname,
                category
            }
        });

    } catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload document' });
    }
});

// ============================================
// UPLOAD LOAN ATTACHMENT
// ============================================
router.post('/loan-attachment', verifyToken, upload.single('attachment'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const userId = req.user.id;
        const loanId = req.body.loanId;
        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}/${loanId}/${Date.now()}_${file.originalname}`;

        // Upload attachment
        const { data, error } = await supabase.storage
            .from('loan-attachments')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Loan attachment upload error:', error);
            return res.status(500).json({ success: false, message: 'Failed to upload attachment' });
        }

        // Create signed URL
        const { data: signedUrlData } = await supabase.storage
            .from('loan-attachments')
            .createSignedUrl(fileName, 3600);

        res.json({
            success: true,
            message: 'Attachment uploaded successfully',
            data: {
                path: data.path,
                signedUrl: signedUrlData?.signedUrl,
                fileName: file.originalname
            }
        });

    } catch (error) {
        console.error('Loan attachment upload error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload attachment' });
    }
});

module.exports = router;
