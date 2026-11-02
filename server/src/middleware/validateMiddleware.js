const { errorResponse } = require('../utils/response');

function validateBody(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (err) {
      if (err.errors) {
        const formattedErrors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return errorResponse(res, 'Validation failed', 400, formattedErrors);
      }
      return errorResponse(res, 'Invalid request data', 400);
    }
  };
}

module.exports = {
  validateBody,
};

