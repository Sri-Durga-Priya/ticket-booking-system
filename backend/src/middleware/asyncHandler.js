/**
 * Async handler wrapper to eliminate try-catch boilerplate in route controllers
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
