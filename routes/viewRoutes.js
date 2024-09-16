// viewRoutes.js

const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.get(
  '/',
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewsController.getOverview,
);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);

// /login route + controller + template (login)
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);

// User's page
router.get('/me', authController.protect, viewsController.getAccount);

// User's bookings:
router.get('/my-tours', authController.protect, viewsController.getMyTours);

// Updating user data (method 2)
router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData,
);

module.exports = router;
