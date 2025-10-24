const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Company name is required'],
    trim: true,
    minlength: [2, 'Company name must be at least 2 characters'],
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  eik: {
    type: String,
    required: [true, 'EIK is required'],
    unique: true,
    trim: true,
    maxlength: [20, 'EIK cannot exceed 20 characters']
  },
  vatNumber: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator(v) {
        return !v || /^[\d\s+()-]+$/.test(v);
      },
      message: 'Invalid phone number format'
    }
  },
  address: {
    street: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 100 },
    country: { type: String, trim: true, maxlength: 100 }
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: [true, 'Creator ID is required'],
    ref: 'User',
    index: true
  },
  subscription: {
    type: { 
      type: String, 
      enum: {
        values: ['free', 'standard', 'premium'],
        message: '{VALUE} is not a valid subscription type'
      },
      default: 'free' 
    },
    expiresAt: { 
      type: Date,
      validate: {
        validator(v) {
          return !v || v > new Date();
        },
        message: 'Expiration date must be in the future'
      }
    }
  },
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  isVerified: { 
    type: Boolean, 
    default: false,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
// Note: email already has unique index from schema definition
companySchema.index({ createdBy: 1, isActive: 1 });
companySchema.index({ isActive: 1, isVerified: 1 });
companySchema.index({ name: 'text', email: 'text' }); // Text search

// Virtual for subscription status
companySchema.virtual('subscriptionStatus').get(function() {
  if (!this.subscription.expiresAt) {
    return this.subscription.type === 'free' ? 'active' : 'unlimited';
  }
  return this.subscription.expiresAt > new Date() ? 'active' : 'expired';
});

// Instance methods
companySchema.methods.isSubscriptionActive = function() {
  if (!this.subscription.expiresAt) {
    return true; // No expiration
  }
  return this.subscription.expiresAt > new Date();
};

companySchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  // Remove sensitive fields if needed
  return obj;
};

// Static methods
companySchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

companySchema.statics.findVerified = function() {
  return this.find({ isVerified: true, isActive: true });
};

companySchema.statics.findByCreator = function(creatorId) {
  return this.find({ createdBy: creatorId, isActive: true });
};

companySchema.statics.search = function(query) {
  return this.find({ 
    $text: { $search: query },
    isActive: true 
  });
};

// Pre-save middleware
companySchema.pre('save', function(next) {
  // Ensure email is lowercase
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// Pre-remove middleware (for soft delete)
companySchema.pre('remove', function(next) {
  // Implement cascading delete logic here if needed
  next();
});

module.exports = mongoose.model('Company', companySchema);
