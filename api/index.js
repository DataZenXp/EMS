const app = require('../src/app');
const connectDB = require('../src/database/connectDB');
const seedDatabase = require('../src/database/seed');

let isConnected = false;

module.exports = async (req, res) => {
  try {
    if (!isConnected) {
      await connectDB();
      await seedDatabase();
      isConnected = true;
    }
  } catch (err) {
    console.error('Serverless database init error:', err.message);
  }
  return app(req, res);
};
