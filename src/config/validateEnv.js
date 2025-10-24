const logger = require('../utils/logger');

/**
 * Validates that all required environment variables are set
 * @throws {Error} If any required variable is missing
 */
function validateEnv() {
  const required = [
    'PORT',
    'MONGO_URI',
    'RABBITMQ_URL',
    'ALLOWED_ORIGINS'
  ];

  const missing = required.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Warn if JWT public key is not set (but don't fail)
  if (!process.env.JWT_PUBLIC_KEY_B64) {
    logger.warn('JWT_PUBLIC_KEY_B64 is not set - authentication will not work properly');
  }

  logger.info('Environment variables validated successfully');
}

module.exports = validateEnv;
