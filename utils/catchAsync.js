module.exports = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

// const catchAsync = (fn) => {
//     return (req, res, next) => { // anon function
//       fn(req, res, next).catch(next); // fn = createTour
//     };
//   };
