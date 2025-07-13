const moment = require('moment-timezone');
const config = require('../config/config');
const logger = require('../utils/logger');

// Middleware kiểm tra thời gian truy cập
const checkAccessTime = (req, res, next) => {
  try {
    // Lấy thời gian hiện tại theo múi giờ GMT+7
    const now = moment().tz(config.accessControl.timezone);
    const currentHour = now.hour();
    
    // Kiểm tra có trong khoảng thời gian bị khóa không (2-5 AM)
    const blockStart = config.accessControl.blockStartHour;
    const blockEnd = config.accessControl.blockEndHour;
    
    if (currentHour >= blockStart && currentHour < blockEnd) {
      logger.warn(`Truy cập bị từ chối vào lúc ${now.format('HH:mm:ss DD/MM/YYYY')} - Hệ thống đang bảo trì`);
      
      return res.status(503).json({
        success: false,
        message: 'Hệ thống đang bảo trì',
        details: `Hệ thống tạm khóa từ ${blockStart}:00 đến ${blockEnd}:00 (GMT+7) hằng ngày để bảo trì.`,
        maintenanceWindow: {
          start: `${blockStart}:00`,
          end: `${blockEnd}:00`,
          timezone: config.accessControl.timezone,
        },
        currentTime: now.format('HH:mm:ss DD/MM/YYYY'),
        nextAccessTime: now.hour(blockEnd).minute(0).second(0).format('HH:mm:ss DD/MM/YYYY'),
      });
    }
    
    // Ghi log truy cập thành công
    logger.info(`Truy cập được phép vào lúc ${now.format('HH:mm:ss DD/MM/YYYY')} - IP: ${req.ip}`);
    
    next();
  } catch (error) {
    logger.error('Lỗi kiểm tra thời gian truy cập:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi kiểm tra thời gian truy cập',
    });
  }
};

// Middleware kiểm tra ngày nghỉ lễ (tuỳ chọn)
const checkHoliday = (req, res, next) => {
  try {
    const now = moment().tz(config.accessControl.timezone);
    
    // Danh sách ngày nghỉ lễ Việt Nam (có thể cấu hình)
    const holidays = [
      '01-01', // Tết Dương lịch
      '30-04', // Giải phóng miền Nam
      '01-05', // Quốc tế lao động
      '02-09', // Quốc khánh
      // Thêm các ngày lễ khác nếu cần
    ];
    
    const currentDate = now.format('DD-MM');
    
    if (holidays.includes(currentDate)) {
      logger.info(`Truy cập vào ngày nghỉ lễ: ${now.format('DD/MM/YYYY')}`);
      
      // Có thể giới hạn một số chức năng trong ngày lễ
      req.isHoliday = true;
    }
    
    next();
  } catch (error) {
    logger.error('Lỗi kiểm tra ngày nghỉ lễ:', error);
    next(); // Tiếp tục ngay cả khi có lỗi
  }
};

// Middleware kiểm tra thời gian backup
const checkBackupTime = (req, res, next) => {
  try {
    const now = moment().tz(config.accessControl.timezone);
    const currentHour = now.hour();
    const currentMinute = now.minute();
    
    // Kiểm tra có trong thời gian backup không (2:00-2:30 AM)
    if (currentHour === 2 && currentMinute <= 30) {
      logger.warn(`Truy cập trong thời gian backup: ${now.format('HH:mm:ss DD/MM/YYYY')}`);
      
      // Chỉ cho phép truy cập đọc, không cho phép ghi/sửa/xóa
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return res.status(503).json({
          success: false,
          message: 'Hệ thống đang backup dữ liệu',
          details: 'Chỉ cho phép truy cập đọc dữ liệu trong thời gian backup (2:00-2:30 AM).',
          backupWindow: {
            start: '2:00',
            end: '2:30',
            timezone: config.accessControl.timezone,
          },
          currentTime: now.format('HH:mm:ss DD/MM/YYYY'),
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('Lỗi kiểm tra thời gian backup:', error);
    next(); // Tiếp tục ngay cả khi có lỗi
  }
};

// Middleware ghi log thời gian truy cập
const logAccessTime = (req, res, next) => {
  try {
    const now = moment().tz(config.accessControl.timezone);
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    logger.info(`[ACCESS] ${req.method} ${req.path} - IP: ${req.ip} - Time: ${now.format('HH:mm:ss DD/MM/YYYY')} - User-Agent: ${userAgent}`);
    
    // Thêm thông tin thời gian vào request
    req.accessTime = now.toDate();
    req.vietnamTime = now.format('HH:mm:ss DD/MM/YYYY');
    
    next();
  } catch (error) {
    logger.error('Lỗi ghi log thời gian truy cập:', error);
    next(); // Tiếp tục ngay cả khi có lỗi
  }
};

// Middleware kiểm tra múi giờ client
const checkClientTimezone = (req, res, next) => {
  try {
    const clientTimezone = req.get('X-Client-Timezone');
    
    if (clientTimezone) {
      // Ghi log múi giờ client
      logger.info(`Client timezone: ${clientTimezone} - Server timezone: ${config.accessControl.timezone}`);
      
      // Thêm thông tin múi giờ vào response headers
      res.set('X-Server-Timezone', config.accessControl.timezone);
      res.set('X-Server-Time', moment().tz(config.accessControl.timezone).format());
    }
    
    next();
  } catch (error) {
    logger.error('Lỗi kiểm tra múi giờ client:', error);
    next(); // Tiếp tục ngay cả khi có lỗi
  }
};

module.exports = {
  checkAccessTime,
  checkHoliday,
  checkBackupTime,
  logAccessTime,
  checkClientTimezone,
};