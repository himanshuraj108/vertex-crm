import morgan from 'morgan';
import { Request, Response } from 'express';
import logger from '../utils/logger';

const stream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

const skip = (): boolean => {
  return process.env.NODE_ENV === 'test';
};

const format =
  process.env.NODE_ENV === 'production'
    ? 'combined'
    : ':method :url :status :res[content-length] - :response-time ms';

export const requestLogger = morgan(format, {
  stream,
  skip,

  immediate: false,
}) as (req: Request, res: Response, next: () => void) => void;
