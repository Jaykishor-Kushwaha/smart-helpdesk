import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { logger } from './logger.js';

let mongod = null;

export async function connectDevDB() {
  try {
    // Start in-memory MongoDB instance
    mongod = await MongoMemoryServer.create({
      instance: {
        port: 27017, // Use standard MongoDB port
        dbName: 'helpdesk'
      }
    });
    
    const uri = mongod.getUri();
    logger.info('Starting in-memory MongoDB...', { uri });
    
    await mongoose.connect(uri);
    logger.info('Connected to in-memory MongoDB successfully');
    
    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to in-memory MongoDB', { error: error.message });
    throw error;
  }
}

export async function disconnectDevDB() {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
    logger.info('Disconnected from in-memory MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from in-memory MongoDB', { error: error.message });
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDevDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDevDB();
  process.exit(0);
});
