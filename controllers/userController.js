const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

/////////////////////////////////////////////////////

// MULTER STORAGE (naming img file)
const multerStorage = multer.memoryStorage();

// MULTER FILTER (check if image)
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload images only.', 400), false);
  }
};

// MULTER UPLOAD
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

/////////////////////////////////////////////////////

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// USER'S /me ENDPOINT //
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// Update the current user
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1. Create error if user POSTs pw data:
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400,
      ),
    );
  }

  // 2. Filter out fields that are not allowed to be updated:
  const filteredBody = filterObj(req.body, 'name', 'email');
  // Add photo property if there's an image file:
  if (req.file) filteredBody.photo = req.file.filename;

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true, // returns the updated obj
    runValidators: true, // mongoose validation
  });

  // Update user document:
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    // 204 = no content
    status: 'success',
    data: null, // don't send any data
  });
});

// Route handlers
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined. Please use /signup instead',
  });
};

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Do NOT update passwords with this
exports.deleteUser = factory.deleteOne(User);
exports.updateUser = factory.updateOne(User);
