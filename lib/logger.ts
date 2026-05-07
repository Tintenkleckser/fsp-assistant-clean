import pino from 'pino';

// Configure logger based on environment
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
  base: null, // Disable default properties
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Add context to logger for better tracing
export const getLogger = (context: { [key: string]: any }) => {
  return logger.child(context);
};

export { logger };

export default logger;