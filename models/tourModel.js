const mongoose = require('mongoose');
const slugify = require('slugify');

// Schema:
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'], // error handling
      unique: true, // all tours must have diff names
      trim: true,
      maxlength: [
        40,
        'The length of a tour must be less or equal to 40 characters.',
      ],
      minlength: [
        10,
        'The length of a tour must be more or equal to 10 characters.',
      ],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a group difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty has to be either: easy, medium or difficult.',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below or equal to 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingQuantity: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 4.5, // default value for rating
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return val < this.price; // check if discount is greater than the price
        },
        message: `Discount price ({VALUE}) must be less than the regular price.`,
      },
    },
    summary: {
      type: String,
      required: [true, 'A tour must have a description'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String, // name of the image
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point', // default geometry in mongodb
        enum: ['Point'],
      },
      coordinates: [Number], // expects an array of numbers
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point', // geometry
          enum: ['Point'], // can only be this geometry
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true }, // virtual properties is part of the output
    toObject: { virtuals: true },
  },
);

// Define index
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

// Define virtual property:
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7; // calculate the weeks
});

// Virtual populate:
tourSchema.virtual('reviews', {
  ref: 'Review', // name of model
  foreignField: 'tour', // name of field in Review model
  localField: '_id', // name of field in this model
});

// DOCUMENT MIDDLEWARE:
// runs before.save() and.create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// QUERY MIDDLEWARE:
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } }); // chaining another find method on the query obj

  this.start = Date.now(); // sets a start property to the current time
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

// Create model
const Tour = mongoose.model('Tour', tourSchema); // model name + scehma

module.exports = Tour;
