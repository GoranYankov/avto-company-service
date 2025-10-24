const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const companyRoutes = require('./routes/companyRoutes');
const healthRoutes = require('./routes/healthRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');
const requestLogger = require('./middlewares/requestLogger');
const corsOptions = require('./middlewares/corsConfig');
const { apiLimiter } = require('./middlewares/rateLimiter');

const app = express();

// Trust proxy - important for rate limiting and logging real IPs
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(requestLogger);

// Rate limiting for API routes
app.use('/api/', apiLimiter);
app.use('/api/health', healthRoutes);
app.use('/api/company', companyRoutes);
app.use(errorMiddleware);

// Health check route (root)
app.get('/', (req, res) => {
  res.json({
    message: 'Auth Service is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
