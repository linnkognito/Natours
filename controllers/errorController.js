const AppError = require('../utils/appError');

// Mongoose CastError:
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// Mongoose duplicate fields:
const handleDuplicateFieldsDB = (err) => {
  const value = Object.values(err.keyValue)[0];
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

// Mongoose validator errors:
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Invalid JWT error:
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

// JWT expired token error:
const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

// Development errors:
const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  // B) RENDERED WEBSITE
  console.error('ERROR ❌', err); // log error for devs
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

// Production errors:
const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // Operational trusted error (send message to client):
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // Programming or other unknown error: don't leak error details:
    console.error('ERROR ❌', err); // log error for devs
    res.status(500).json({ status: 'error', message: 'Something went wrong' }); // send generic message
  }
  // B) RENDERED WEBSITE
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
  console.error('ERROR ❌', err); // log error for devs
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!', // send generic message
    msg: 'Please try again later.',
  });
};

// Error handling middleware (Express):
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500; // default status code
  err.status = err.status || 'error'; // default status

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  }

  if (process.env.NODE_ENV === 'production ') {
    let error = Object.create(err); // shallow copy of err obj

    // Mongoose errors:
    if (error.name === 'CastError') {
      error = handleCastErrorDB(error);
    }
    if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }
    if (error.name === 'ValidationError') {
      error = handleValidationErrorDB(error);
    }
    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError(error);
    }
    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError(error);
    }

    sendErrorProd(error, req, res); // !!
  }
};
