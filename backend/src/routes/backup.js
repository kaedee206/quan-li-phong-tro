const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const config = require('../config/config');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const moment = require('moment-timezone');

// Import các models
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const Note = require('../models/Note');

// Tạo thư mục backup nếu chưa có
const backupDir = path.join(__dirname, '../../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// POST /api/backup/create - Tạo backup dữ liệu
router.post('/create', async (req, res) => {
  try {
    const { includeFiles = true, description = '' } = req.body;
    
    // Tạo timestamp cho backup
    const timestamp = moment().tz(config.timezone).format('YYYYMMDD_HHmmss');
    const backupName = `backup_${timestamp}.zip`;
    const backupPath = path.join(backupDir, backupName);

    // Tạo archive
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Nén tối đa
    });

    // Lắng nghe sự kiện
    output.on('close', () => {
      logger.info(`Backup hoàn thành: ${backupName} (${archive.pointer()} bytes)`);
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    // Backup dữ liệu database
    logger.info('Bắt đầu backup dữ liệu...');
    
    const [rooms, tenants, contracts, payments, notes] = await Promise.all([
      Room.find({ isActive: true }).populate('tenant'),
      Tenant.find({ isActive: true }).populate('room'),
      Contract.find({ isActive: true }).populate('room tenant'),
      Payment.find({ isActive: true }).populate('room tenant contract'),
      Note.find({ isActive: true }).populate('relatedTo.id'),
    ]);

    // Tạo file JSON cho từng collection
    const backupData = {
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        description: description || 'Backup tự động',
        stats: {
          rooms: rooms.length,
          tenants: tenants.length,
          contracts: contracts.length,
          payments: payments.length,
          notes: notes.length,
        },
      },
      rooms,
      tenants,
      contracts,
      payments,
      notes,
    };

    // Thêm dữ liệu vào archive
    archive.append(JSON.stringify(backupData, null, 2), { name: 'data.json' });

    // Backup files nếu được yêu cầu
    if (includeFiles) {
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (fs.existsSync(uploadsDir)) {
        logger.info('Backup files...');
        archive.directory(uploadsDir, 'uploads');
      }

      // Backup logs
      const logsDir = path.join(__dirname, '../../logs');
      if (fs.existsSync(logsDir)) {
        logger.info('Backup logs...');
        archive.directory(logsDir, 'logs');
      }
    }

    // Tạo file README
    const readmeContent = `# Backup dữ liệu hệ thống quản lý phòng trọ

## Thông tin backup
- Thời gian: ${moment().tz(config.timezone).format('DD/MM/YYYY HH:mm:ss')}
- Mô tả: ${description || 'Backup tự động'}
- Phiên bản: 1.0.0

## Thống kê dữ liệu
- Phòng: ${rooms.length}
- Khách thuê: ${tenants.length}
- Hợp đồng: ${contracts.length}
- Thanh toán: ${payments.length}
- Ghi chú: ${notes.length}

## Cấu trúc file
- data.json: Dữ liệu database
- uploads/: File tải lên (hình ảnh, tài liệu)
- logs/: File log hệ thống

## Cách khôi phục
1. Giải nén file backup
2. Import dữ liệu từ data.json
3. Khôi phục file uploads và logs
`;

    archive.append(readmeContent, { name: 'README.md' });

    // Hoàn thành archive
    await archive.finalize();

    // Đợi file được tạo xong
    await new Promise((resolve) => {
      output.on('close', resolve);
    });

    // Lấy thông tin file
    const stats = fs.statSync(backupPath);
    const fileSize = stats.size;

    logger.info(`Backup thành công: ${backupName}`);

    res.json({
      success: true,
      message: 'Tạo backup thành công',
      data: {
        fileName: backupName,
        filePath: backupPath,
        fileSize,
        createdAt: new Date().toISOString(),
        stats: backupData.metadata.stats,
      },
    });
  } catch (error) {
    logger.error('Lỗi tạo backup:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo backup',
      error: error.message,
    });
  }
});

// GET /api/backup/list - Lấy danh sách backup
router.get('/list', async (req, res) => {
  try {
    const files = fs.readdirSync(backupDir);
    const backups = files
      .filter(file => file.startsWith('backup_') && file.endsWith('.zip'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        // Parse timestamp từ tên file
        const timestampMatch = file.match(/backup_(\d{8}_\d{6})\.zip/);
        const timestamp = timestampMatch ? timestampMatch[1] : null;
        
        return {
          fileName: file,
          filePath,
          fileSize: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          timestamp,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    logger.info(`Tìm thấy ${backups.length} backup`);

    res.json({
      success: true,
      data: {
        backups,
        total: backups.length,
        totalSize: backups.reduce((sum, backup) => sum + backup.fileSize, 0),
      },
    });
  } catch (error) {
    logger.error('Lỗi lấy danh sách backup:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách backup',
      error: error.message,
    });
  }
});

// GET /api/backup/download/:fileName - Tải backup
router.get('/download/:fileName', (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(backupDir, fileName);

    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File backup không tồn tại',
      });
    }

    // Kiểm tra file có phải backup không
    if (!fileName.startsWith('backup_') || !fileName.endsWith('.zip')) {
      return res.status(400).json({
        success: false,
        message: 'File không hợp lệ',
      });
    }

    const stats = fs.statSync(filePath);
    
    // Set headers cho download
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', stats.size);

    // Ghi log download
    logger.info(`Download backup: ${fileName}`);

    // Stream file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    logger.error('Lỗi tải backup:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải backup',
      error: error.message,
    });
  }
});

// DELETE /api/backup/:fileName - Xóa backup
router.delete('/:fileName', (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(backupDir, fileName);

    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File backup không tồn tại',
      });
    }

    // Kiểm tra file có phải backup không
    if (!fileName.startsWith('backup_') || !fileName.endsWith('.zip')) {
      return res.status(400).json({
        success: false,
        message: 'File không hợp lệ',
      });
    }

    // Xóa file
    fs.unlinkSync(filePath);

    logger.info(`Xóa backup: ${fileName}`);

    res.json({
      success: true,
      message: 'Xóa backup thành công',
    });
  } catch (error) {
    logger.error('Lỗi xóa backup:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa backup',
      error: error.message,
    });
  }
});

// POST /api/backup/cleanup - Dọn dẹp backup cũ
router.post('/cleanup', async (req, res) => {
  try {
    const { retentionDays = config.backup.retentionDays } = req.body;
    
    const files = fs.readdirSync(backupDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let deletedCount = 0;
    let deletedSize = 0;

    for (const file of files) {
      if (file.startsWith('backup_') && file.endsWith('.zip')) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          deletedSize += stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
          logger.info(`Xóa backup cũ: ${file}`);
        }
      }
    }

    logger.info(`Dọn dẹp backup: Xóa ${deletedCount} file (${deletedSize} bytes)`);

    res.json({
      success: true,
      message: 'Dọn dẹp backup thành công',
      data: {
        deletedCount,
        deletedSize,
        retentionDays,
        cutoffDate,
      },
    });
  } catch (error) {
    logger.error('Lỗi dọn dẹp backup:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi dọn dẹp backup',
      error: error.message,
    });
  }
});

// GET /api/backup/info/:fileName - Lấy thông tin backup
router.get('/info/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(backupDir, fileName);

    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File backup không tồn tại',
      });
    }

    const stats = fs.statSync(filePath);
    
    // Parse timestamp từ tên file
    const timestampMatch = fileName.match(/backup_(\d{8}_\d{6})\.zip/);
    const timestamp = timestampMatch ? timestampMatch[1] : null;
    
    let parsedTimestamp = null;
    if (timestamp) {
      parsedTimestamp = moment(timestamp, 'YYYYMMDD_HHmmss').tz(config.timezone);
    }

    res.json({
      success: true,
      data: {
        fileName,
        fileSize: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        timestamp: parsedTimestamp ? parsedTimestamp.format('DD/MM/YYYY HH:mm:ss') : null,
        isValid: fileName.startsWith('backup_') && fileName.endsWith('.zip'),
      },
    });
  } catch (error) {
    logger.error('Lỗi lấy thông tin backup:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin backup',
      error: error.message,
    });
  }
});

// GET /api/backup/stats - Thống kê backup
router.get('/stats', async (req, res) => {
  try {
    const files = fs.readdirSync(backupDir);
    const backups = files.filter(file => file.startsWith('backup_') && file.endsWith('.zip'));
    
    let totalSize = 0;
    let oldestBackup = null;
    let newestBackup = null;

    for (const file of backups) {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;

      if (!oldestBackup || stats.birthtime < oldestBackup.createdAt) {
        oldestBackup = { fileName: file, createdAt: stats.birthtime };
      }

      if (!newestBackup || stats.birthtime > newestBackup.createdAt) {
        newestBackup = { fileName: file, createdAt: stats.birthtime };
      }
    }

    // Tính dung lượng thư mục backup
    const backupDirStats = fs.statSync(backupDir);

    res.json({
      success: true,
      data: {
        totalBackups: backups.length,
        totalSize,
        averageSize: backups.length > 0 ? Math.round(totalSize / backups.length) : 0,
        oldestBackup,
        newestBackup,
        backupDirectory: backupDir,
        retentionDays: config.backup.retentionDays,
        lastCleanup: backupDirStats.mtime,
      },
    });
  } catch (error) {
    logger.error('Lỗi lấy thống kê backup:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê backup',
      error: error.message,
    });
  }
});

module.exports = router;