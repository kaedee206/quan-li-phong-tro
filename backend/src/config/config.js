// Cấu hình chung cho ứng dụng
module.exports = {
  // Cấu hình server
  server: {
    port: process.env.PORT || 5000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
  },

  // Cấu hình database
  database: {
    uri: process.env.MONGODB_URI,
    name: process.env.DB_NAME || 'quan_li_phong_tro',
  },

  // Cấu hình JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Cấu hình Discord
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  },

  // Cấu hình QR thanh toán
  qr: {
    bankCode: process.env.QR_BANK_CODE || 'bidv',
    accountNumber: process.env.QR_ACCOUNT_NUMBER || '3950630937',
    accountName: process.env.QR_ACCOUNT_NAME || 'Pham%20Thi%20Luyen',
    baseUrl: 'https://img.vietqr.io/image',
  },

  // Cấu hình backup
  backup: {
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // 2AM daily
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    directory: process.env.BACKUP_DIR || './backups',
  },

  // Cấu hình time zone
  timezone: process.env.TZ || 'Asia/Ho_Chi_Minh',

  // Cấu hình khóa truy cập
  accessControl: {
    blockStartHour: 2, // 2 AM
    blockEndHour: 5,   // 5 AM
    timezone: 'Asia/Ho_Chi_Minh',
  },

  // Cấu hình giá cố định
  pricing: {
    waterPrice: 5000,    // 5,000 VND per unit
    electricityPrice: 3000, // 3,000 VND per unit
    roomBasePrice: 800000,  // 800,000 VND fixed
  },

  // Cấu hình CORS
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },

  // Cấu hình upload file
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    directory: './uploads',
  },

  // Cấu hình rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
};