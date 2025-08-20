import { logger } from './logger.js';

export async function withRetry(
  operation,
  options = {}
) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = (error) => true,
    onRetry = () => {},
    operationName = 'operation'
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      if (attempt > 1) {
        logger.info(`${operationName} succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !retryCondition(error)) {
        logger.error(`${operationName} failed after ${attempt} attempts`, { error: error.message });
        throw error;
      }
      
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );
      
      logger.warn(`${operationName} failed on attempt ${attempt}, retrying in ${delay}ms`, { 
        error: error.message,
        attempt,
        maxAttempts
      });
      
      onRetry(error, attempt);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Specific retry configurations for different operations
export const retryConfigs = {
  database: {
    maxAttempts: 3,
    baseDelay: 500,
    retryCondition: (error) => {
      // Retry on connection errors, timeouts, etc.
      return error.code === 'ECONNRESET' || 
             error.code === 'ETIMEDOUT' || 
             error.message.includes('connection') ||
             error.message.includes('timeout');
    }
  },
  
  triage: {
    maxAttempts: 2,
    baseDelay: 1000,
    retryCondition: (error) => {
      // Don't retry validation errors or 4xx errors
      return !error.status || error.status >= 500;
    }
  },
  
  external: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 8000,
    retryCondition: (error) => {
      // Retry on network errors and 5xx responses
      return error.code === 'ECONNRESET' || 
             error.code === 'ETIMEDOUT' ||
             (error.status && error.status >= 500);
    }
  }
};
