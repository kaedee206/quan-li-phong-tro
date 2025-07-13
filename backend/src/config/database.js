const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Cấu hình kết nối MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB kết nối thành công: ${conn.connection.host}`);
    
    // Lắng nghe các sự kiện kết nối
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose đã kết nối tới MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('Lỗi kết nối MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose đã ngắt kết nối khỏi MongoDB');
    });

    // Xử lý graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Kết nối MongoDB đã được đóng do ứng dụng kết thúc');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Lỗi kết nối MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;