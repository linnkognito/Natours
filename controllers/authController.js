const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync'); // dont have to use try/catch blocks
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

// Helper function for responses:
const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Cookie variable
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true, //
  };

  // Send cookie
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; // only set secure prop for production mode
  res.cookie('jwt', token, cookieOptions);

  // Remove password from the output:
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// SIGNUP ////////////////////////////////////////////////////////
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  // Send response:
  createAndSendToken(newUser, 201, res);
});

// LOGIN & GET TOKEN ////////////////////////////////////////////
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check if email & pw exists
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2. Check if user exists && pw is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3. If OK, send token to client
  createAndSendToken(user, 200, res);
});

// COOKIE WITHOUT JWT to log out user
exports.logout = (req, res) => {
  res.cookie('jwt', 'logged out', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

// Protected routes middleware
exports.protect = catchAsync(async (req, res, next) => {
  // 1. Get token & check if it exists:
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]; // key/value from header
  } else if (req.cookies.jwt && req.cookies.jwt !== 'loggedout') {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not logged in. Please login to get access.', 401),
    );
  }

  // 2. Verification token:
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // comparing

  // 3. Check if user still exist:
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401,
      ),
    );
  }

  // 4. Check if user changed password after the token was issued:
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }

  // 5.If all above steps were successful, grant access to protected route (getalltours):
  req.user = currentUser; // add user data to the request
  res.locals.user = currentUser;
  next();
});

exports.isLoggedIn = async (req, res, next) => {
  // Check if there's a cookie called jwt
  if (req.cookies.jwt) {
    try {
      // 1. Verify token:
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2. Check if user still exist:
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3. Check if user changed password after the token was issued:
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // 4. There is a logged in user:
      res.locals.user = currentUser; // add user data for Pug
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

/* eslint-disable */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403), // 403 = forbidden
      );
    }
    next();
  };
};
/* eslint-enable */

// Password reset:
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get pw based on POSTed email:
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404)); // 404 = not found
  }

  // 2. Generate random reset token:
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3. Send token to users email:
  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`; // reset url

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false }); // save the data

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500,
      ),
    ); // 500 = server error
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2. Set new password if token has not expired and user exists:
  if (!user) {
    return next(new AppError('Token is invalid or has expired.', 400)); // bad request
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); // save changes

  // 3. Update changedPasswordAt property for the user:
  // this is a middleware in the user model

  // 4. Log in the user (send JWT):
  createAndSendToken(user, 200, res);
});

// Updating user: password:
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2. Check if POSTed pw is correct:
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(
      new AppError('This password does not match your current password', 401),
    );
  }

  // 3. Update "password" and "passwordConfirm":
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByAndUpdate will NOT work (only works with save/create)

  // 4. Log in user (send JWT) with new pw
  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
  });
});
