const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config/config');
const requestLogger = require('./middleware/loggerMiddleware');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const apiRoutes = require('./routes');

const app = express();

// Enable Cross-Origin Resource Sharing for all origins/ports seamlessly
app.use(cors({
  origin: true,
  credentials: true
}));

// HTTP Request Logging
app.use(requestLogger);

// Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie Parsing Middleware
app.use(cookieParser(config.COOKIE_SECRET));

// API Routes Mount
app.use('/api/v1', apiRoutes);

// Serve Frontend Static Files seamlessly from public or root directory
const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
app.use(express.static(publicDir));
app.use(express.static(rootDir));
app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {
  const htmlPath = require('fs').existsSync(path.join(publicDir, 'index.html'))
    ? path.join(publicDir, 'index.html')
    : path.join(rootDir, 'index.html');
  res.sendFile(htmlPath);
});

// 404 Route Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
