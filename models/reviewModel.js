const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
  },
  {
    // Make virtual properties part of the output
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// User can only post 1 review per tour:
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Populating user field:
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

// Get the average rating statistics:
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // Get all reviews belonging to a tour & calc avg:
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  console.log(stats);
  // Persist to database (update fields) only if there actually are stats (if there's no reviews, there's no stats)
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // If no reviews, set values back to default:
    await Tour.findByIdAndUpdate(tourId, {
      ratingQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// Use "post" so all documents gets saved in the DB before making the calculations
reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.tour);
});

// Recalculate the average ratings on update/delete
reviewSchema.pre(/^findOneAnd/, async function (next) {
  const r = await this.clone().findOne();
  next();
});
reviewSchema.post(/^findOneAnd/, async function () {
  if (this.r && this.r.tour) {
    await this.r.constructor.calcAverageRatings(this.r.tour);
  }
});

// Create & export model:
const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
