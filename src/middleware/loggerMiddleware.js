const morgan = require('morgan');
const config = require('../config/config');

const customFormat = ':method :url :status :res[content-length] - :response-time ms';

const requestLogger = morgan(config.NODE_ENV === 'production' ? 'combined' : customFormat);

module.exports = requestLogger;
