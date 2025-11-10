const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    // Identifier (email or phone)
    identifier: {
        type: String,
        required: [true, 'Identifier is required'],
        trim: true,
        lowercase: true
    },

    // OTP Code
    otp: {
        type: String,
        required: [true, 'OTP is required'],
        length: 6
    },

    // Type of OTP
    type: {
        type: String,
        required: [true, 'OTP type is required'],
        enum: ['signup', 'reset', 'verification', 'login'],
        default: 'verification'
    },

    // Expiration time
    expiresAt: {
        type: Date,
        default: function() {
            return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        },
        index: { expires: 0 } // TTL index - automatically delete expired documents
    },

    // Attempt tracking
    attempts: {
        type: Number,
        default: 0,
        max: [3, 'Maximum OTP verification attempts exceeded']
    },

    // Verification status
    verified: {
        type: Boolean,
        default: false
    },

    // Associated user (if exists)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    // Metadata
    ipAddress: String,
    userAgent: String,

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    verifiedAt: Date
}, {
    timestamps: true
});

// Indexes
otpSchema.index({ identifier: 1, type: 1, expiresAt: -1 });
otpSchema.index({ userId: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Instance methods
otpSchema.methods = {
    // Verify OTP
    async verifyOTP(inputOTP) {
        // Check if expired
        if (Date.now() > this.expiresAt.getTime()) {
            throw new Error('OTP has expired');
        }

        // Check attempts
        if (this.attempts >= 3) {
            throw new Error('Maximum verification attempts exceeded');
        }

        // Increment attempts
        this.attempts += 1;

        // Check OTP match
        if (this.otp === inputOTP) {
            this.verified = true;
            this.verifiedAt = new Date();
            await this.save();
            return true;
        } else {
            await this.save();
            throw new Error('Invalid OTP code');
        }
    },

    // Resend OTP
    async resendOTP() {
        // Reset attempts and extend expiration
        this.attempts = 0;
        this.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        this.createdAt = new Date();
        await this.save();
    },

    // Check if expired
    isExpired() {
        return Date.now() > this.expiresAt.getTime();
    }
};

// Static methods
otpSchema.statics = {
    // Generate new OTP
    generateOTP(length = 6) {
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += Math.floor(Math.random() * 10);
        }
        return otp;
    },

    // Find valid OTP for identifier and type
    async findValidOTP(identifier, type) {
        return await this.findOne({
            identifier: identifier.toLowerCase(),
            type: type,
            expiresAt: { $gt: new Date() },
            verified: false
        });
    },

    // Clean up expired OTPs (manual cleanup, TTL should handle this)
    async cleanupExpired() {
        const result = await this.deleteMany({
            expiresAt: { $lt: new Date() }
        });
        return result.deletedCount;
    },

    // Check rate limiting for OTP requests
    async checkRateLimit(identifier, windowMinutes = 15) {
        const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

        const count = await this.countDocuments({
            identifier: identifier.toLowerCase(),
            createdAt: { $gte: windowStart }
        });

        return count < 5; // Allow max 5 OTP requests per 15 minutes
    }
};

// Pre-save middleware
otpSchema.pre('save', function(next) {
    if (this.isModified('verified') && this.verified) {
        this.verifiedAt = new Date();
    }
    next();
});

module.exports = mongoose.model('OTP', otpSchema);
