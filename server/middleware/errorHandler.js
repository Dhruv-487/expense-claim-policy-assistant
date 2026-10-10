import { ApiError } from '../utils/apiError.js';

export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let { statusCode = 500, message = 'Internal Server Error' } = err;

  // Handle specific Mongoose errors
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with ID of ${err.value}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value entered';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join(', ');
  }

  const response = {
    success: false,
    statusCode,
    message,
    errors: err.errors || [],
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};
