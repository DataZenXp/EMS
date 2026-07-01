const mongoose = require('mongoose');
const config = require('../config/config');

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const mongoUri = config.MONGO_URI;

  // In production (Vercel), a real cloud MongoDB URI is required
  if (config.NODE_ENV === 'production' && (!mongoUri || mongoUri.includes('127.0.0.1') || mongoUri.includes('localhost'))) {
    console.error('[MongoDB Fatal]: Production requires a cloud MongoDB URI (e.g., MongoDB Atlas).');
    console.error('[MongoDB Fatal]: Set MONGO_URI in Vercel Environment Variables.');
    console.error('[MongoDB Fatal]: Current MONGO_URI:', mongoUri || '(not set)');
    throw new Error('Production requires a cloud MongoDB URI. Set MONGO_URI environment variable.');
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
  } catch (error) {
    console.warn(`[MongoDB Notice]: Could not connect to MongoDB at ${mongoUri} (${error.message}).`);

    // Only attempt in-memory fallback in development mode
    if (config.NODE_ENV !== 'production') {
      console.log(`[Zero-Config Mode]: Launching embedded MongoDB Memory Server for local development...`);
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        const conn = await mongoose.connect(uri);
        console.log(`[MongoDB Memory Server Active]: Connected to embedded instance at ${uri}`);
      } catch (memError) {
        console.error(`[Fatal Database Error]: Could not start embedded MongoDB: ${memError.message}`);
        throw memError;
      }
    } else {
      console.error(`[Fatal Database Error]: Cannot connect to MongoDB in production. Check your MONGO_URI.`);
      throw error;
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Disconnected]: Connection lost.');
});

module.exports = connectDB;
