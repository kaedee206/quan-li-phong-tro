const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình multer cho upload file đính kèm
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/notes');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'note-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 
      'application/pdf', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Loại file không được hỗ trợ'));
    }
  }
});

// GET /api/notes - Lấy danh sách ghi chú
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      priority,
      search,
      isCompleted,
      isReminder,
      tag,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Tạo filter object
    const filter = { isActive: true };
    
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (isCompleted !== undefined) filter.isCompleted = isCompleted === 'true';
    if (isReminder !== undefined) filter.isReminder = isReminder === 'true';
    if (tag) filter.tags = tag;

    // Tìm kiếm text
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Tạo sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Tính toán pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Note.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Lấy dữ liệu
    const notes = await Note.find(filter)
      .populate('relatedTo.id', 'number name contractNumber')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    logger.info(`Lấy danh sách ghi chú - Trang ${page}, Tìm thấy ${notes.length}/${total} ghi chú`);

    res.json({
      success: true,
      data: notes,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    logger.error('Lỗi lấy danh sách ghi chú:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách ghi chú',
    });
  }
});

// GET /api/notes/important - Lấy ghi chú quan trọng
router.get('/important', async (req, res) => {
  try {
    const notes = await Note.findImportant()
      .populate('relatedTo.id', 'number name contractNumber');

    logger.info(`Lấy ghi chú quan trọng - Tìm thấy ${notes.length} ghi chú`);

    res.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    logger.error('Lỗi lấy ghi chú quan trọng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy ghi chú quan trọng',
    });
  }
});

// GET /api/notes/reminders - Lấy ghi chú nhắc nhở
router.get('/reminders', async (req, res) => {
  try {
    const notes = await Note.findDueReminders()
      .populate('relatedTo.id', 'number name contractNumber');

    logger.info(`Lấy ghi chú nhắc nhở - Tìm thấy ${notes.length} ghi chú`);

    res.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    logger.error('Lỗi lấy ghi chú nhắc nhở:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy ghi chú nhắc nhở',
    });
  }
});

// GET /api/notes/categories/:category - Lấy ghi chú theo danh mục
router.get('/categories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const notes = await Note.findByCategory(category)
      .populate('relatedTo.id', 'number name contractNumber');

    logger.info(`Lấy ghi chú theo danh mục ${category} - Tìm thấy ${notes.length} ghi chú`);

    res.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    logger.error('Lỗi lấy ghi chú theo danh mục:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy ghi chú theo danh mục',
    });
  }
});

// GET /api/notes/tags/:tag - Lấy ghi chú theo tag
router.get('/tags/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    const notes = await Note.findByTag(tag)
      .populate('relatedTo.id', 'number name contractNumber');

    logger.info(`Lấy ghi chú theo tag ${tag} - Tìm thấy ${notes.length} ghi chú`);

    res.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    logger.error('Lỗi lấy ghi chú theo tag:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy ghi chú theo tag',
    });
  }
});

// GET /api/notes/:id - Lấy thông tin chi tiết ghi chú
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('relatedTo.id', 'number name contractNumber phone email');

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghi chú',
      });
    }

    logger.info(`Lấy thông tin ghi chú ${note.title}`);

    res.json({
      success: true,
      data: note,
    });
  } catch (error) {
    logger.error('Lỗi lấy thông tin ghi chú:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin ghi chú',
    });
  }
});

// POST /api/notes - Tạo ghi chú mới
router.post('/', upload.array('attachments', 5), async (req, res) => {
  try {
    const noteData = req.body;
    
    // Xử lý tags
    if (req.body.tags) {
      if (typeof req.body.tags === 'string') {
        noteData.tags = req.body.tags.split(',').map(tag => tag.trim().toLowerCase());
      }
    }

    // Xử lý relatedTo
    if (req.body.relatedTo) {
      if (typeof req.body.relatedTo === 'string') {
        noteData.relatedTo = JSON.parse(req.body.relatedTo);
      }
    }

    // Xử lý file đính kèm
    if (req.files && req.files.length > 0) {
      noteData.attachments = req.files.map(file => ({
        url: `/uploads/notes/${file.filename}`,
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
      }));
    }

    const note = new Note(noteData);
    await note.save();

    logger.info(`Tạo ghi chú mới: ${note.title}`);

    res.status(201).json({
      success: true,
      message: 'Tạo ghi chú mới thành công',
      data: note,
    });
  } catch (error) {
    logger.error('Lỗi tạo ghi chú mới:', error);
    
    // Xóa file đã upload nếu có lỗi
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) logger.error('Lỗi xóa file:', err);
        });
      });
    }

    res.status(400).json({
      success: false,
      message: 'Lỗi khi tạo ghi chú mới',
      error: error.message,
    });
  }
});

// PUT /api/notes/:id - Cập nhật ghi chú
router.put('/:id', upload.array('attachments', 5), async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghi chú',
      });
    }

    const updateData = req.body;
    
    // Xử lý tags
    if (req.body.tags) {
      if (typeof req.body.tags === 'string') {
        updateData.tags = req.body.tags.split(',').map(tag => tag.trim().toLowerCase());
      }
    }

    // Xử lý relatedTo
    if (req.body.relatedTo) {
      if (typeof req.body.relatedTo === 'string') {
        updateData.relatedTo = JSON.parse(req.body.relatedTo);
      }
    }

    // Xử lý file đính kèm mới
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        url: `/uploads/notes/${file.filename}`,
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
      }));
      
      // Thêm file mới vào danh sách file hiện tại
      updateData.attachments = [...note.attachments, ...newAttachments];
    }

    // Cập nhật ghi chú
    Object.assign(note, updateData);
    await note.save();

    logger.info(`Cập nhật ghi chú: ${note.title}`);

    res.json({
      success: true,
      message: 'Cập nhật ghi chú thành công',
      data: note,
    });
  } catch (error) {
    logger.error('Lỗi cập nhật ghi chú:', error);
    
    // Xóa file đã upload nếu có lỗi
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) logger.error('Lỗi xóa file:', err);
        });
      });
    }

    res.status(400).json({
      success: false,
      message: 'Lỗi khi cập nhật ghi chú',
      error: error.message,
    });
  }
});

// PUT /api/notes/:id/complete - Đánh dấu ghi chú hoàn thành
router.put('/:id/complete', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghi chú',
      });
    }

    await note.markAsCompleted();

    logger.info(`Đánh dấu ghi chú hoàn thành: ${note.title}`);

    res.json({
      success: true,
      message: 'Đánh dấu ghi chú hoàn thành thành công',
      data: note,
    });
  } catch (error) {
    logger.error('Lỗi đánh dấu ghi chú hoàn thành:', error);
    res.status(400).json({
      success: false,
      message: 'Lỗi khi đánh dấu ghi chú hoàn thành',
      error: error.message,
    });
  }
});

// PUT /api/notes/:id/reminder - Đặt nhắc nhở cho ghi chú
router.put('/:id/reminder', async (req, res) => {
  try {
    const { reminderDate } = req.body;
    
    if (!reminderDate) {
      return res.status(400).json({
        success: false,
        message: 'Ngày nhắc nhở là bắt buộc',
      });
    }

    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghi chú',
      });
    }

    await note.setReminder(new Date(reminderDate));

    logger.info(`Đặt nhắc nhở cho ghi chú: ${note.title}`);

    res.json({
      success: true,
      message: 'Đặt nhắc nhở thành công',
      data: note,
    });
  } catch (error) {
    logger.error('Lỗi đặt nhắc nhở:', error);
    res.status(400).json({
      success: false,
      message: 'Lỗi khi đặt nhắc nhở',
      error: error.message,
    });
  }
});

// DELETE /api/notes/:id/reminder - Hủy nhắc nhở của ghi chú
router.delete('/:id/reminder', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghi chú',
      });
    }

    await note.cancelReminder();

    logger.info(`Hủy nhắc nhở cho ghi chú: ${note.title}`);

    res.json({
      success: true,
      message: 'Hủy nhắc nhở thành công',
      data: note,
    });
  } catch (error) {
    logger.error('Lỗi hủy nhắc nhở:', error);
    res.status(400).json({
      success: false,
      message: 'Lỗi khi hủy nhắc nhở',
      error: error.message,
    });
  }
});

// DELETE /api/notes/:id - Xóa ghi chú
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghi chú',
      });
    }

    // Soft delete
    note.isActive = false;
    await note.save();

    logger.info(`Xóa ghi chú: ${note.title}`);

    res.json({
      success: true,
      message: 'Xóa ghi chú thành công',
    });
  } catch (error) {
    logger.error('Lỗi xóa ghi chú:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa ghi chú',
    });
  }
});

// DELETE /api/notes/:id/attachment/:attachmentIndex - Xóa file đính kèm
router.delete('/:id/attachment/:attachmentIndex', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    const attachmentIndex = parseInt(req.params.attachmentIndex);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghi chú',
      });
    }

    if (attachmentIndex < 0 || attachmentIndex >= note.attachments.length) {
      return res.status(400).json({
        success: false,
        message: 'Index file đính kèm không hợp lệ',
      });
    }

    // Lấy đường dẫn file
    const attachmentUrl = note.attachments[attachmentIndex].url;
    const filePath = path.join(__dirname, '../../', attachmentUrl);

    // Xóa file khỏi hệ thống
    fs.unlink(filePath, (err) => {
      if (err) {
        logger.error('Lỗi xóa file đính kèm:', err);
      }
    });

    // Xóa khỏi database
    note.attachments.splice(attachmentIndex, 1);
    await note.save();

    logger.info(`Xóa file đính kèm của ghi chú ${note.title}`);

    res.json({
      success: true,
      message: 'Xóa file đính kèm thành công',
    });
  } catch (error) {
    logger.error('Lỗi xóa file đính kèm:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa file đính kèm',
    });
  }
});

// GET /api/notes/stats - Thống kê ghi chú
router.get('/stats/overview', async (req, res) => {
  try {
    const totalNotes = await Note.countDocuments({ isActive: true });
    const completedNotes = await Note.countDocuments({ isCompleted: true, isActive: true });
    const pendingNotes = await Note.countDocuments({ isCompleted: false, isActive: true });
    const reminderNotes = await Note.countDocuments({ isReminder: true, isActive: true });
    const dueReminders = await Note.countDocuments({ 
      isReminder: true, 
      reminderDate: { $lte: new Date() }, 
      isCompleted: false,
      isActive: true 
    });

    // Thống kê theo danh mục
    const categoryStats = await Note.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$isCompleted', false] }, 1, 0] } },
        }
      }
    ]);

    // Thống kê theo độ ưu tiên
    const priorityStats = await Note.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$isCompleted', false] }, 1, 0] } },
        }
      }
    ]);

    // Thống kê theo tháng
    const monthlyStats = await Note.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' }, 
            month: { $month: '$createdAt' } 
          },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$isCompleted', false] }, 1, 0] } },
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Tags phổ biến
    const popularTags = await Note.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    logger.info('Lấy thống kê ghi chú');

    res.json({
      success: true,
      data: {
        overview: {
          totalNotes,
          completedNotes,
          pendingNotes,
          reminderNotes,
          dueReminders,
          completionRate: totalNotes > 0 ? ((completedNotes / totalNotes) * 100).toFixed(1) : 0,
        },
        categoryStats,
        priorityStats,
        monthlyStats,
        popularTags,
      },
    });
  } catch (error) {
    logger.error('Lỗi lấy thống kê ghi chú:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê ghi chú',
    });
  }
});

module.exports = router;