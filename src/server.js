const app = require('./app');
const connectDB = require('./database/connectDB');
const seedDatabase = require('./database/seed');
const config = require('./config/config');

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();
  await seedDatabase();

  const server = app.listen(config.PORT, () => {
    console.log(`[EMS Server]: Running in ${config.NODE_ENV} mode on port ${config.PORT}`);
    console.log(`[EMS API]: Accessible at http://localhost:${config.PORT}/api/v1`);
  });

  // Handle Unhandled Promise Rejections
  process.on('unhandledRejection', (err) => {
    console.error(`[Unhandled Rejection]: ${err.message}`);
    server.close(() => process.exit(1));
  });

  // Handle Uncaught Exceptions
  process.on('uncaughtException', (err) => {
    console.error(`[Uncaught Exception]: ${err.message}`);
    process.exit(1);
  });
};

startServer();
