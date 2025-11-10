const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Basic Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },

    // Contact Information
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(email) {
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
            },
            message: 'Please enter a valid email'
        }
    },
    phone: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        validate: {
            validator: function(phone) {
                if (!phone) return true; // Optional field
                return /^\+?[1-9]\d{1,14}$/.test(phone);
            },
            message: 'Please enter a valid phone number'
        }
    },

    // Authentication
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false // Don't include in queries by default
    },

    // Verification Status
    emailVerified: {
        type: Boolean,
        default: false
    },
    phoneVerified: {
        type: Boolean,
        default: false
    },

    // Onboarding Status
    onboardingCompleted: {
        type: Boolean,
        default: false
    },
    profileCompleted: {
        type: Boolean,
        default: false
    },

    // Role and Permissions
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },

    // Account Status
    isActive: {
        type: Boolean,
        default: true
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    lockReason: {
        type: String,
        enum: ['suspicious_activity', 'payment_failure', 'admin_action'],
        default: null
    },

    // Security
    loginAttempts: {
        type: Number,
        default: 0
    },
    lastLoginAttempt: {
        type: Date,
        default: null
    },
    lastLogin: {
        type: Date,
        default: null
    },
    passwordChangedAt: {
        type: Date,
        default: null
    },
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Profile Information (to be filled during onboarding)
    dateOfBirth: Date,
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },

    // Employment Information
    employmentStatus: {
        type: String,
        enum: ['employed', 'self_employed', 'unemployed', 'student', 'retired']
    },
    monthlyIncome: {
        type: Number,
        min: 0
    },
    employerName: String,
    occupation: String,

    // Financial Information
    creditScore: Number,
    bankAccount: {
        bankName: String,
        accountNumber: String,
        routingNumber: String
    },

    // Next of Kin
    nextOfKin: {
        name: String,
        relationship: String,
        phone: String,
        email: String
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'address.city': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
userSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
});

// Instance methods
userSchema.methods = {
    // Compare password for login
    async comparePassword(candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
    },

    // Generate password reset token
    createPasswordResetToken() {
        const resetToken = crypto.randomBytes(32).toString('hex');
        this.passwordResetToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        return resetToken;
    },

    // Check if password was changed after token was issued
    changedPasswordAfter(JWTTimestamp) {
        if (this.passwordChangedAt) {
            const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
            return JWTTimestamp < changedTimestamp;
        }
        return false;
    },

    // Increment login attempts
    async incrementLoginAttempts() {
        this.loginAttempts += 1;
        this.lastLoginAttempt = new Date();

        // Lock account after 5 failed attempts
        if (this.loginAttempts >= 5) {
            this.isLocked = true;
            this.lockReason = 'suspicious_activity';
        }

        await this.save({ validateBeforeSave: false });
    },

    // Reset login attempts on successful login
    async resetLoginAttempts() {
        this.loginAttempts = 0;
        this.lastLogin = new Date();
        this.lastLoginAttempt = null;

        // Unlock account if it was locked due to failed attempts
        if (this.isLocked && this.lockReason === 'suspicious_activity') {
            this.isLocked = false;
            this.lockReason = null;
        }

        await this.save({ validateBeforeSave: false });
    }
};

// Static methods
userSchema.statics = {
    // Find user by email or phone
    async findByEmailOrPhone(identifier) {
        const isEmail = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(identifier);

        if (isEmail) {
            return await this.findOne({ email: identifier.toLowerCase() });
        } else {
            return await this.findOne({ phone: identifier });
        }
    }
};

// Pre-save middleware
userSchema.pre('save', async function(next) {
    // Only run if password was modified
    if (!this.isModified('password')) return next();

    // Hash password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);

    // Set password changed timestamp
    this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure JWT is issued after

    next();
});

// Pre-save middleware for updatedAt
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('User', userSchema);
