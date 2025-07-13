require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Import configurations and utilities
const config = require('./config/config');
const connectDB = require('./config/database');
const logger = require('./utils/logger');

// Import middleware
const { checkAccessTime, logAccessTime, checkClientTimezone } = require('./middleware/timeAccess');

// Import routes
const roomRoutes = require('./routes/rooms');
const tenantRoutes = require('./routes/tenants');
const contractRoutes = require('./routes/contracts');
const paymentRoutes = require('./routes/payments');
const noteRoutes = require('./routes/notes');
const discordRoutes = require('./routes/discord');
const qrRoutes = require('./routes/qr');
const backupRoutes = require('./routes/backup');
const healthRoutes = require('./routes/health');

// Tạo Express app
const app = express();

// Kết nối database
connectDB();

// Tạo thư mục uploads nếu chưa có
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Timezone'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Static files
app.use('/uploads', express.static(uploadsDir));

// Custom middleware
app.use(logAccessTime);
app.use(checkClientTimezone);
app.use(checkAccessTime); // Kiểm tra thời gian truy cập

// Health check endpoint (không bị giới hạn thời gian)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server đang hoạt động',
    timestamp: new Date().toISOString(),
    timezone: config.timezone,
  });
});

// API routes
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/discord', discordRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/health', healthRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'API Quản lý phòng trọ',
    version: '1.0.0',
    endpoints: {
      rooms: '/api/rooms',
      tenants: '/api/tenants',
      contracts: '/api/contracts',
      payments: '/api/payments',
      notes: '/api/notes',
      discord: '/api/discord',
      qr: '/api/qr',
      backup: '/api/backup',
      health: '/api/health',
    },
    documentation: 'https://github.com/kaedee206/quan-li-phong-tro',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint không tồn tại',
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Lỗi server:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} đã tồn tại`,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token đã hết hạn',
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi server nội bộ',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
  logger.info(`Server đang chạy trên http://${HOST}:${PORT}`);
  logger.info(`Môi trường: ${config.server.env}`);
  logger.info(`Múi giờ: ${config.timezone}`);
  logger.info(`Thời gian khóa truy cập: ${config.accessControl.blockStartHour}:00 - ${config.accessControl.blockEndHour}:00`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;