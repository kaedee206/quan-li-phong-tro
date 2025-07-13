const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

// Import models để kiểm tra
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const Note = require('../models/Note');

// GET /api/health - Health check tổng quát
router.get('/', async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      checks: {},
    };

    // Kiểm tra database
    try {
      const dbState = mongoose.connection.readyState;
      const dbStatus = {
        connected: dbState === 1,
        state: getDbStateText(dbState),
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      };

      if (dbState === 1) {
        // Kiểm tra kết nối bằng cách đếm documents
        const roomCount = await Room.countDocuments();
        dbStatus.testQuery = `${roomCount} rooms found`;
      }

      healthStatus.checks.database = {
        status: dbState === 1 ? 'healthy' : 'unhealthy',
        ...dbStatus,
      };
    } catch (error) {
      healthStatus.checks.database = {
        status: 'unhealthy',
        error: error.message,
      };
    }

    // Kiểm tra Discord webhook
    try {
      if (config.discord.webhookUrl) {
        const webhookResponse = await axios.get(config.discord.webhookUrl, {
          timeout: 5000,
        });
        
        healthStatus.checks.discord = {
          status: 'healthy',
          configured: true,
          webhookName: webhookResponse.data.name,
          channelId: webhookResponse.data.channel_id,
        };
      } else {
        healthStatus.checks.discord = {
          status: 'warning',
          configured: false,
          message: 'Discord webhook chưa được cấu hình',
        };
      }
    } catch (error) {
      healthStatus.checks.discord = {
        status: 'unhealthy',
        configured: true,
        error: error.message,
      };
    }

    // Kiểm tra QR service
    try {
      const qrConfigured = !!(config.qr.bankCode && config.qr.accountNumber && config.qr.accountName);
      
      if (qrConfigured) {
        // Test URL QR
        const testUrl = `${config.qr.baseUrl}/${config.qr.bankCode}-${config.qr.accountNumber}-print.jpg`;
        const qrResponse = await axios.head(testUrl, {
          timeout: 5000,
        });
        
        healthStatus.checks.qr = {
          status: 'healthy',
          configured: true,
          bankCode: config.qr.bankCode,
          accountNumber: config.qr.accountNumber,
          responseStatus: qrResponse.status,
        };
      } else {
        healthStatus.checks.qr = {
          status: 'warning',
          configured: false,
          message: 'QR payment chưa được cấu hình đầy đủ',
        };
      }
    } catch (error) {
      healthStatus.checks.qr = {
        status: 'unhealthy',
        configured: true,
        error: error.message,
      };
    }

    // Kiểm tra memory usage
    const memoryUsage = process.memoryUsage();
    healthStatus.checks.memory = {
      status: 'healthy',
      usage: {
        rss: formatBytes(memoryUsage.rss),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        heapUsed: formatBytes(memoryUsage.heapUsed),
        external: formatBytes(memoryUsage.external),
      },
      raw: memoryUsage,
    };

    // Kiểm tra disk space (backup directory)
    try {
      const fs = require('fs');
      const path = require('path');
      const backupDir = path.join(__dirname, '../../backups');
      
      if (fs.existsSync(backupDir)) {
        const files = fs.readdirSync(backupDir);
        const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.zip'));
        
        let totalSize = 0;
        backupFiles.forEach(file => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        });

        healthStatus.checks.backup = {
          status: 'healthy',
          directory: backupDir,
          totalBackups: backupFiles.length,
          totalSize: formatBytes(totalSize),
          lastBackup: backupFiles.length > 0 ? backupFiles[backupFiles.length - 1] : null,
        };
      } else {
        healthStatus.checks.backup = {
          status: 'warning',
          message: 'Thư mục backup chưa tồn tại',
        };
      }
    } catch (error) {
      healthStatus.checks.backup = {
        status: 'unhealthy',
        error: error.message,
      };
    }

    // Kiểm tra time zone
    const currentTime = moment().tz(config.timezone);
    healthStatus.checks.timezone = {
      status: 'healthy',
      timezone: config.timezone,
      currentTime: currentTime.format('DD/MM/YYYY HH:mm:ss'),
      utcOffset: currentTime.utcOffset(),
    };

    // Xác định status tổng quát
    const unhealthyChecks = Object.values(healthStatus.checks).filter(
      check => check.status === 'unhealthy'
    ).length;
    
    const warningChecks = Object.values(healthStatus.checks).filter(
      check => check.status === 'warning'
    ).length;

    if (unhealthyChecks > 0) {
      healthStatus.status = 'unhealthy';
    } else if (warningChecks > 0) {
      healthStatus.status = 'warning';
    }

    logger.info(`Health check: ${healthStatus.status}`);

    // Set HTTP status code dựa trên health status
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'warning' ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      data: healthStatus,
    });
  } catch (error) {
    logger.error('Lỗi health check:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra health',
      error: error.message,
    });
  }
});

// GET /api/health/db - Kiểm tra database
router.get('/db', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
      connected: dbState === 1,
      state: getDbStateText(dbState),
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      timestamp: new Date().toISOString(),
    };

    if (dbState === 1) {
      // Kiểm tra các collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      dbStatus.collections = collections.map(col => col.name);

      // Kiểm tra số lượng documents
      const [roomCount, tenantCount, contractCount, paymentCount, noteCount] = await Promise.all([
        Room.countDocuments(),
        Tenant.countDocuments(),
        Contract.countDocuments(),
        Payment.countDocuments(),
        Note.countDocuments(),
      ]);

      dbStatus.documentCounts = {
        rooms: roomCount,
        tenants: tenantCount,
        contracts: contractCount,
        payments: paymentCount,
        notes: noteCount,
      };

      // Test tạo document
      const testDoc = new Room({
        number: 'TEST',
        name: 'Test Room',
        price: 1000,
        area: 1,
        floor: 1,
        isActive: false,
      });
      
      await testDoc.save();
      await Room.findByIdAndDelete(testDoc._id);
      
      dbStatus.writeTest = 'passed';
    }

    const status = dbState === 1 ? 'healthy' : 'unhealthy';
    logger.info(`Database health check: ${status}`);

    res.json({
      success: true,
      data: {
        status,
        ...dbStatus,
      },
    });
  } catch (error) {
    logger.error('Lỗi kiểm tra database:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra database',
      error: error.message,
    });
  }
});

// GET /api/health/discord - Kiểm tra Discord webhook
router.get('/discord', async (req, res) => {
  try {
    if (!config.discord.webhookUrl) {
      return res.json({
        success: true,
        data: {
          status: 'warning',
          configured: false,
          message: 'Discord webhook chưa được cấu hình',
        },
      });
    }

    const response = await axios.get(config.discord.webhookUrl, {
      timeout: 10000,
    });

    logger.info('Discord webhook health check: healthy');

    res.json({
      success: true,
      data: {
        status: 'healthy',
        configured: true,
        webhook: {
          name: response.data.name,
          avatar: response.data.avatar,
          channelId: response.data.channel_id,
          guildId: response.data.guild_id,
        },
        responseTime: response.headers['x-response-time'],
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Lỗi kiểm tra Discord:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra Discord webhook',
      error: error.message,
    });
  }
});

// GET /api/health/qr - Kiểm tra QR service
router.get('/qr', async (req, res) => {
  try {
    const qrConfigured = !!(config.qr.bankCode && config.qr.accountNumber && config.qr.accountName);
    
    if (!qrConfigured) {
      return res.json({
        success: true,
        data: {
          status: 'warning',
          configured: false,
          message: 'QR payment chưa được cấu hình đầy đủ',
          config: {
            bankCode: !!config.qr.bankCode,
            accountNumber: !!config.qr.accountNumber,
            accountName: !!config.qr.accountName,
          },
        },
      });
    }

    // Test URL QR
    const testUrl = `${config.qr.baseUrl}/${config.qr.bankCode}-${config.qr.accountNumber}-print.jpg`;
    const response = await axios.head(testUrl, {
      timeout: 10000,
    });

    logger.info('QR service health check: healthy');

    res.json({
      success: true,
      data: {
        status: 'healthy',
        configured: true,
        config: {
          bankCode: config.qr.bankCode,
          accountNumber: config.qr.accountNumber,
          accountName: decodeURIComponent(config.qr.accountName),
          baseUrl: config.qr.baseUrl,
        },
        testUrl,
        responseStatus: response.status,
        responseHeaders: response.headers,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Lỗi kiểm tra QR service:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra QR service',
      error: error.message,
    });
  }
});

// GET /api/health/system - Kiểm tra hệ thống
router.get('/system', (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const systemInfo = {
      status: 'healthy',
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        rss: formatBytes(memoryUsage.rss),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        heapUsed: formatBytes(memoryUsage.heapUsed),
        external: formatBytes(memoryUsage.external),
        arrayBuffers: formatBytes(memoryUsage.arrayBuffers),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      env: {
        nodeEnv: process.env.NODE_ENV,
        timezone: config.timezone,
        port: config.server.port,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info('System health check: healthy');

    res.json({
      success: true,
      data: systemInfo,
    });
  } catch (error) {
    logger.error('Lỗi kiểm tra hệ thống:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra hệ thống',
      error: error.message,
    });
  }
});

// Helper functions
function getDbStateText(state) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    4: 'uninitialized',
  };
  return states[state] || 'unknown';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;