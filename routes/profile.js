const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');
const { authenticateUser, handleValidationErrors } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/profiles');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with user ID
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `profile-${req.user.id}-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Check file type
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// @route   POST /api/profile/upload-picture
// @desc    Upload profile picture
// @access  Private
router.post('/upload-picture', authenticateUser, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Create URL for the uploaded file
        const fileUrl = `/uploads/profiles/${req.file.filename}`;

        // Update profile with new picture URL
        const { data: profile, error } = await supabase
            .from('profiles')
            .update({
                profile_picture_url: fileUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id)
            .select('*')
            .single();

        if (error) {
            console.error('Profile picture update error:', error);
            // Clean up uploaded file if database update fails
            fs.unlinkSync(req.file.path);
            return res.status(500).json({
                success: false,
                message: 'Failed to update profile picture'
            });
        }

        // Delete old profile picture if it exists
        if (profile.profile_picture_url && profile.profile_picture_url !== fileUrl) {
            const oldFilePath = path.join(__dirname, '..', profile.profile_picture_url);
            if (fs.existsSync(oldFilePath)) {
                try {
                    fs.unlinkSync(oldFilePath);
                } catch (err) {
                    console.warn('Failed to delete old profile picture:', err.message);
                }
            }
        }

        res.json({
            success: true,
            message: 'Profile picture updated successfully',
            data: {
                ...profile,
                profile_picture_url: fileUrl
            }
        });

    } catch (error) {
        console.error('Profile picture upload error:', error);
        // Clean up uploaded file if something goes wrong
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile picture'
        });
    }
});

// @route   DELETE /api/profile/picture
// @desc    Delete profile picture
// @access  Private
router.delete('/picture', authenticateUser, async (req, res) => {
    try {
        // Get current profile to find existing picture
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('profile_picture_url')
            .eq('id', req.user.id)
            .single();

        if (fetchError) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch profile'
            });
        }

        // Update profile to remove picture URL
        const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update({
                profile_picture_url: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id)
            .select('*')
            .single();

        if (error) {
            console.error('Profile picture delete error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete profile picture'
            });
        }

        // Delete file from filesystem
        if (profile.profile_picture_url) {
            const filePath = path.join(__dirname, '..', profile.profile_picture_url);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (err) {
                    console.warn('Failed to delete profile picture file:', err.message);
                }
            }
        }

        res.json({
            success: true,
            message: 'Profile picture deleted successfully',
            data: updatedProfile
        });

    } catch (error) {
        console.error('Profile picture delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete profile picture'
        });
    }
});

// @route   GET /api/profile
// @desc    Get user profile
// @access  Private
router.get('/', authenticateUser, async (req, res) => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error) {
            console.error('Profile fetch error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch profile'
            });
        }

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        // Calculate profile completion percentage
        const requiredFields = [
            'first_name', 'last_name', 'email', 'phone',
            'date_of_birth', 'gender', 'street', 'city', 'country',
            'employment_status', 'monthly_income'
        ];

        const completedFields = requiredFields.filter(field => profile[field] !== null && profile[field] !== '');
        const completionPercentage = Math.round((completedFields.length / requiredFields.length) * 100);

        res.json({
            success: true,
            data: {
                ...profile,
                profile_completion: completionPercentage
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/profile
// @desc    Update user profile
// @access  Private
router.put('/', authenticateUser, [
    body('first_name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    body('last_name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    body('phone')
        .optional()
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Please provide a valid phone number'),
    body('date_of_birth')
        .optional()
        .isISO8601()
        .withMessage('Please provide a valid date of birth'),
    body('gender')
        .optional()
        .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
        .withMessage('Please provide a valid gender'),
    body('monthly_income')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Monthly income must be a positive number'),
    body('credit_score')
        .optional()
        .isInt({ min: 300, max: 850 })
        .withMessage('Credit score must be between 300 and 850'),
    handleValidationErrors
], async (req, res) => {
    try {
        const updateData = req.body;

        // Remove any fields that shouldn't be updated directly
        delete updateData.id;
        delete updateData.email; // Email should be updated through auth
        delete updateData.created_at;
        delete updateData.role; // Role should be managed by admin

        // Add updated_at timestamp
        updateData.updated_at = new Date().toISOString();

        const { data: profile, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', req.user.id)
            .select('*')
            .single();

        if (error) {
            console.error('Profile update error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update profile'
            });
        }

        // Calculate updated completion percentage
        const requiredFields = [
            'first_name', 'last_name', 'email', 'phone',
            'date_of_birth', 'gender', 'street', 'city', 'country',
            'employment_status', 'monthly_income'
        ];

        const completedFields = requiredFields.filter(field => profile[field] !== null && profile[field] !== '');
        const completionPercentage = Math.round((completedFields.length / requiredFields.length) * 100);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                ...profile,
                profile_completion: completionPercentage
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/profile/complete-onboarding
// @desc    Mark onboarding as complete
// @access  Private
router.put('/complete-onboarding', authenticateUser, async (req, res) => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .update({
                onboarding_completed: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id)
            .select('*')
            .single();

        if (error) {
            console.error('Complete onboarding error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to complete onboarding'
            });
        }

        res.json({
            success: true,
            message: 'Onboarding completed successfully',
            data: profile
        });
    } catch (error) {
        console.error('Complete onboarding error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/profile/complete-profile
// @desc    Mark profile as complete
// @access  Private
router.put('/complete-profile', authenticateUser, async (req, res) => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .update({
                profile_completed: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id)
            .select('*')
            .single();

        if (error) {
            console.error('Complete profile error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to complete profile'
            });
        }

        res.json({
            success: true,
            message: 'Profile completed successfully',
            data: profile
        });
    } catch (error) {
        console.error('Complete profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;
