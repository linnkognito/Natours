const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
//const catchAsync = require('../utils/catchAsync');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter a name'],
    // unique: true,
    minlength: [3, 'A name must be at least 3 characters long'],
    maxlength: [30, 'A name must be shorter or equal to 30 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please enter your email'],
    //match: /^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
    unique: true,
    lowercase: true, // convert to lowercase
    validate: [validator.isEmail, 'Please enter a valid email address'], // required validator
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please enter a password'],
    minlength: [8, 'A password must contain at least 8 characters'],
    select: false, // never show pw in any output
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please verify your password'],
    validate: {
      // Only works for create & save:
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords do not match',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false, // keep this field hidden
  },
});

// Encryption:
userSchema.pre('save', async function (next) {
  // Only run if pw was modified:
  if (!this.isModified('password')) return next();

  // Hash the pw with cost of 12:
  this.password = await bcrypt.hash(this.password, 12);

  // Delete the passwordConfirm field:
  this.passwordConfirm = undefined;
});

// Update the changePasswordAt property:
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query (object)
  this.find({ active: { $ne: false } });
  next();
});

// Instance method: Compare original pw w/ encrypted pw:
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method: Check if user changed their pw after token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );

    return JWTTimestamp < changedTimeStamp; // true = changed
  }

  return false; // false = NOT changed
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Encrypt & set schema property:
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken) // update to encrypted version
    .digest('hex'); // store as hex

  // Set expiration for reset token in ms:
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Create model:
const User = mongoose.model('User', userSchema);

module.exports = User;
