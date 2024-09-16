// app.js

const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

// PUG /////////////////////////////////////////
app.set('view engine', 'pug'); // engine
app.set('views', path.join(__dirname, 'views')); // pug templates (views)

// GLOBAL MIDDLEWARES //////////////////////////
// Serving static files:
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers (helmet):
app.use(helmet(mongoSanitize()));

// LEAFLET CSP /////////////////////////////////
const scriptSrcUrls = [
  'https://unpkg.com/',
  'https://tile.openstreetmap.org',
  'https://js.stripe.com',
];
const styleSrcUrls = [
  'https://unpkg.com/',
  'https://tile.openstreetmap.org',
  'https://fonts.googleapis.com/',
];
const connectSrcUrls = [
  'https://unpkg.com',
  'https://tile.openstreetmap.org',
  'ws://127.0.0.1:51249',
  'wss://127.0.0.1:51249',
  'https://js.stripe.com',
];
const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// Set security http headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: [],
      imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
      fontSrc: ["'self'", ...fontSrcUrls],
      frameSrc: ["'self'", 'https://js.stripe.com'],
    },
  }),
);

/////////////////////////////////////////////////

// Development logging:
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

/////////////////////////////////////////////////

// Limit requests from same IP:
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 100 req per h from same IP
  message: 'Too many requests from this IP, please try again in an hour.',
});
app.use('/api', limiter); // limits routes starting w /api

// PARSERS /////////////////////////////////////
// Body parser - parsing data from body into req.body:
app.use(express.json({ limit: '10kb' }));
// Form parser:
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// Cookie parser - parses data from cookies:
app.use(cookieParser());

// SANITIZATION ////////////////////////////////
// Data sanitation against NoSQL query injection:
app.use(mongoSanitize());

// Data sanitization against XSS attacks:
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// COMPRESSION ////////////////////////////////
app.use(compression());

// TEST MW - add current time to req
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// MOUNTING ROUTES /////////////////////////////
// Specifies what middleware gets called whenever a user tries to access any of these routes //
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Unhandled routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`), 404);
});

// Error handling middleware (Express)
app.use(globalErrorHandler);

module.exports = app;
