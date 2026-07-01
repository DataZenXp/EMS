const mongoose = require('mongoose');
const config = require('../config/config');

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    // Attempt connecting to external/local MongoDB with a 2-second timeout
    const conn = await mongoose.connect(config.MONGO_URI, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
  } catch (error) {
    console.warn(`[MongoDB Notice]: Could not connect to external MongoDB (${error.message}).`);
    console.log(`[Zero-Config Mode]: Launching embedded real MongoDB Memory Server...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`[MongoDB Memory Server Active]: Connected to embedded instance at ${uri}`);
    } catch (memError) {
      console.error(`[Fatal Database Error]: Could not start embedded MongoDB: ${memError.message}`);
      process.exit(1);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Disconnected]: Attempting reconnection...');
});

module.exports = connectDB;
