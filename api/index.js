const app = require('../src/app');
const connectDB = require('../src/database/connectDB');
const seedDatabase = require('../src/database/seed');

let isConnected = false;
let connectionError = null;

module.exports = async (req, res) => {
  // If previous connection attempt failed, retry
  if (connectionError && !isConnected) {
    connectionError = null;
  }

  try {
    if (!isConnected) {
      await connectDB();
      await seedDatabase();
      isConnected = true;
      connectionError = null;
    }
  } catch (err) {
    console.error('Serverless database init error:', err.message);
    connectionError = err;

    // Return a proper error response instead of passing to Express with no DB
    if (req.url.startsWith('/api/')) {
      return res.status(503).json({
        success: false,
        message: 'Database connection failed. Check MONGO_URI environment variable.',
        error: err.message
      });
    }
  }

  return app(req, res);
};
