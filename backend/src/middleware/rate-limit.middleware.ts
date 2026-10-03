import rateLimit from 'express-rate-limit';
import { ApiResponse } from '../utils/ApiResponse';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json(
      ApiResponse.error('Terlalu banyak percobaan login, silakan coba lagi setelah 15 menit')
    );
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      ApiResponse.error('Terlalu banyak permintaan, silakan coba beberapa saat lagi')
    );
  },
});
