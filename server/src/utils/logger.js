/**
 * Application Logger
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  let metaStr = '';
  if (meta) {
    if (meta instanceof Error) {
      metaStr = `\n${meta.stack || meta.message}`;
    } else if (typeof meta === 'object') {
      metaStr = ` ${JSON.stringify(meta)}`;
    } else {
      metaStr = ` ${meta}`;
    }
  }
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

const logger = {
  info: (message, meta) => {
    console.log(`${colors.green}${formatMessage('INFO', message, meta)}${colors.reset}`);
  },
  warn: (message, meta) => {
    console.warn(`${colors.yellow}${formatMessage('WARN', message, meta)}${colors.reset}`);
  },
  error: (message, meta) => {
    console.error(`${colors.red}${formatMessage('ERROR', message, meta)}${colors.reset}`);
  },
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${colors.cyan}${formatMessage('DEBUG', message, meta)}${colors.reset}`);
    }
  },
};

module.exports = logger;

