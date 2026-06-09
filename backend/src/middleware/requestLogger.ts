import morgan from 'morgan';
import { Request, Response } from 'express';
import logger from '../utils/logger';

// Create a write stream that pipes Morgan output to Winston
const stream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

// Skip logging in test environments
const skip = (): boolean => {
  return process.env.NODE_ENV === 'test';
};

// Use 'combined' in production, 'dev' in development
const format =
  process.env.NODE_ENV === 'production'
    ? 'combined'
    : ':method :url :status :res[content-length] - :response-time ms';

export const requestLogger = morgan(format, {
  stream,
  skip,
  // Add request ID if present
  immediate: false,
}) as (req: Request, res: Response, next: () => void) => void;
