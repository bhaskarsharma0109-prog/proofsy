/**
 * Request validation middleware
 * Validates incoming request data against Joi schemas
 */
const { AppError } = require("./errorHandler");

const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { value, error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      }));

      return next(
        new AppError(
          `Validation Error: ${details.map((d) => d.message).join(", ")}`,
          400
        )
      );
    }

    req[property] = value;
    next();
  };
};

module.exports = { validate };
