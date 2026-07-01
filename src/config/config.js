require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ems_production',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_ems_4node_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'cookie_signature_secret_ems',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000'
};
