const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info;

function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] < currentLevel) return;
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    message,
    ...meta,
  };
  if (level === 'error' || level === 'warn') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (meta, msg) => log('debug', msg, meta),
  info: (meta, msg) => log('info', msg, meta),
  warn: (meta, msg) => log('warn', msg, meta),
  error: (meta, msg) => log('error', msg, meta),
};
