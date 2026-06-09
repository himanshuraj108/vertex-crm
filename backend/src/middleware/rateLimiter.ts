import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter: 100 requests per 15 minutes per IP.
 * Returns a JSON error when the limit is exceeded.
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,   // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please try again in 15 minutes.',
    },
  },
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});
