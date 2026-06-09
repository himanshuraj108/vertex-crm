import winston from 'winston';

const { combine, timestamp, colorize, printf, errors } = winston.format;

const isDev = process.env.NODE_ENV !== 'production';

const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  const base = `[${ts}] ${level}: ${message}`;
  return stack ? `${base}\n${stack}` : base;
});

const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    isDev
      ? combine(colorize({ all: true }), logFormat)
      : combine(logFormat)
  ),
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
    }),
  ],
  exitOnError: false,
});

export default logger;
