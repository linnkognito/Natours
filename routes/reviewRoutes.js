const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

router.use(authController.protect); // auth before accessing any review route

// Get all reviews & Create review:
router.route('/').get(reviewController.getAllReviews).post(
  authController.protect,
  authController.restrictTo('user'), // admins can't post
  reviewController.setTourUserIds, // mw for additional if statements
  reviewController.createReview,
);

// Get ID (the factory function deleteOne uses it)
router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview,
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview,
  );

module.exports = router;
