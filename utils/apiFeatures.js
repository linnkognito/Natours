class APIFeatures {
  constructor(query, queryString) {
    this.query = query; // query object (mongoose)
    this.queryString = queryString; // query parameters
  }

  filter() {
    const queryObj = { ...this.queryString }; // create copy of query parameters
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]); // exclude fields

    // Advanced filtering:
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); // convert operators

    // Apply filter to query:
    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      // if sort exists in the query str
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt'); // if nothing is specified
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v'); // exclude fields w/ -
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1; // convert to number + set default
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
