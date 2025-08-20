import mongoose from 'mongoose';
import { config } from '../config.js';
import { logger } from './logger.js';

export async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri, { dbName: 'helpdesk' });
    logger.info('Connected to MongoDB', { uri: config.mongoUri });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', {
      error: error.message,
      mongoUri: config.mongoUri
    });
    throw error;
  }
}