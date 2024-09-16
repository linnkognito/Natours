const User = require('../models/userModel');
const catchAsync = require('./catchAsync');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // calling parent class

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // For cleaner debugging:
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
