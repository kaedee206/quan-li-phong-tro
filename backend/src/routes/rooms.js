const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình multer cho upload hình ảnh
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/rooms');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'room-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép file hình ảnh (JPEG, PNG, GIF)'));
    }
  }
});

// GET /api/rooms - Lấy danh sách phòng
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      floor, 
      minPrice, 
      maxPrice, 
      search,
      sortBy = 'number',
      sortOrder = 'asc'
    } = req.query;

    // Tạo filter object
    const filter = { isActive: true };
    
    if (status) filter.status = status;
    if (floor) filter.floor = parseInt(floor);
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseInt(minPrice);
      if (maxPrice) filter.price.$lte = parseInt(maxPrice);
    }
    if (search) {
      filter.$or = [
        { number: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Tạo sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Tính toán pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Room.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Lấy dữ liệu
    const rooms = await Room.find(filter)
      .populate('tenant', 'name phone email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    logger.info(`Lấy danh sách phòng - Trang ${page}, Tìm thấy ${rooms.length}/${total} phòng`);

    res.json({
      success: true,
      data: rooms,
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
    logger.error('Lỗi lấy danh sách phòng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách phòng',
    });
  }
});

// GET /api/rooms/available - Lấy danh sách phòng trống
router.get('/available', async (req, res) => {
  try {
    const rooms = await Room.findAvailable()
      .sort({ number: 1 });

    logger.info(`Lấy danh sách phòng trống - Tìm thấy ${rooms.length} phòng`);

    res.json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    logger.error('Lỗi lấy danh sách phòng trống:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách phòng trống',
    });
  }
});

// GET /api/rooms/:id - Lấy thông tin chi tiết phòng
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('tenant', 'name phone email idCard')
      .populate({
        path: 'contracts',
        populate: {
          path: 'tenant',
          select: 'name phone email'
        }
      })
      .populate({
        path: 'payments',
        populate: {
          path: 'tenant',
          select: 'name'
        }
      });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng',
      });
    }

    logger.info(`Lấy thông tin phòng ${room.number}`);

    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    logger.error('Lỗi lấy thông tin phòng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin phòng',
    });
  }
});

// POST /api/rooms - Tạo phòng mới
router.post('/', upload.array('images', 10), async (req, res) => {
  try {
    const roomData = req.body;
    
    // Xử lý hình ảnh upload
    if (req.files && req.files.length > 0) {
      roomData.images = req.files.map((file, index) => ({
        url: `/uploads/rooms/${file.filename}`,
        caption: req.body[`imageCaption${index}`] || '',
        isPrimary: index === 0, // Ảnh đầu tiên làm ảnh chính
      }));
    }

    // Xử lý amenities
    if (req.body.amenities) {
      if (typeof req.body.amenities === 'string') {
        roomData.amenities = JSON.parse(req.body.amenities);
      }
    }

    const room = new Room(roomData);
    await room.save();

    logger.info(`Tạo phòng mới: ${room.number}`);

    res.status(201).json({
      success: true,
      message: 'Tạo phòng mới thành công',
      data: room,
    });
  } catch (error) {
    logger.error('Lỗi tạo phòng mới:', error);
    
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
      message: 'Lỗi khi tạo phòng mới',
      error: error.message,
    });
  }
});

// PUT /api/rooms/:id - Cập nhật thông tin phòng
router.put('/:id', upload.array('images', 10), async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng',
      });
    }

    const updateData = req.body;
    
    // Xử lý hình ảnh upload mới
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => ({
        url: `/uploads/rooms/${file.filename}`,
        caption: req.body[`imageCaption${index}`] || '',
        isPrimary: false,
      }));
      
      // Thêm ảnh mới vào danh sách ảnh hiện tại
      updateData.images = [...room.images, ...newImages];
    }

    // Xử lý amenities
    if (req.body.amenities) {
      if (typeof req.body.amenities === 'string') {
        updateData.amenities = JSON.parse(req.body.amenities);
      }
    }

    // Cập nhật phòng
    Object.assign(room, updateData);
    await room.save();

    logger.info(`Cập nhật phòng: ${room.number}`);

    res.json({
      success: true,
      message: 'Cập nhật phòng thành công',
      data: room,
    });
  } catch (error) {
    logger.error('Lỗi cập nhật phòng:', error);
    
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
      message: 'Lỗi khi cập nhật phòng',
      error: error.message,
    });
  }
});

// DELETE /api/rooms/:id - Xóa phòng
router.delete('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng',
      });
    }

    // Kiểm tra phòng có đang được sử dụng không
    if (room.tenant || room.status === 'occupied') {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa phòng đang có khách thuê',
      });
    }

    // Kiểm tra có hợp đồng hoặc thanh toán liên quan không
    const contractCount = await Contract.countDocuments({ room: room._id });
    const paymentCount = await Payment.countDocuments({ room: room._id });

    if (contractCount > 0 || paymentCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa phòng có hợp đồng hoặc thanh toán liên quan',
      });
    }

    // Soft delete
    room.isActive = false;
    await room.save();

    logger.info(`Xóa phòng: ${room.number}`);

    res.json({
      success: true,
      message: 'Xóa phòng thành công',
    });
  } catch (error) {
    logger.error('Lỗi xóa phòng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa phòng',
    });
  }
});

// DELETE /api/rooms/:id/image/:imageIndex - Xóa hình ảnh của phòng
router.delete('/:id/image/:imageIndex', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    const imageIndex = parseInt(req.params.imageIndex);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng',
      });
    }

    if (imageIndex < 0 || imageIndex >= room.images.length) {
      return res.status(400).json({
        success: false,
        message: 'Index hình ảnh không hợp lệ',
      });
    }

    // Lấy đường dẫn file
    const imageUrl = room.images[imageIndex].url;
    const filePath = path.join(__dirname, '../../', imageUrl);

    // Xóa file khỏi hệ thống
    fs.unlink(filePath, (err) => {
      if (err) {
        logger.error('Lỗi xóa file hình ảnh:', err);
      }
    });

    // Xóa khỏi database
    room.images.splice(imageIndex, 1);
    await room.save();

    logger.info(`Xóa hình ảnh của phòng ${room.number}`);

    res.json({
      success: true,
      message: 'Xóa hình ảnh thành công',
    });
  } catch (error) {
    logger.error('Lỗi xóa hình ảnh:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa hình ảnh',
    });
  }
});

// GET /api/rooms/stats - Thống kê phòng
router.get('/stats/overview', async (req, res) => {
  try {
    const totalRooms = await Room.countDocuments({ isActive: true });
    const availableRooms = await Room.countDocuments({ status: 'available', isActive: true });
    const occupiedRooms = await Room.countDocuments({ status: 'occupied', isActive: true });
    const maintenanceRooms = await Room.countDocuments({ status: 'maintenance', isActive: true });
    const reservedRooms = await Room.countDocuments({ status: 'reserved', isActive: true });

    // Thống kê theo tầng
    const floorStats = await Room.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$floor',
          total: { $sum: 1 },
          available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
          occupied: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } },
          maintenance: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } },
          reserved: { $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] } },
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Thống kê doanh thu
    const monthlyRevenue = await Payment.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id: { year: '$year', month: '$month' },
          totalRevenue: { $sum: '$totalAmount' },
          totalPayments: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    logger.info('Lấy thống kê phòng');

    res.json({
      success: true,
      data: {
        overview: {
          totalRooms,
          availableRooms,
          occupiedRooms,
          maintenanceRooms,
          reservedRooms,
          occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0,
        },
        floorStats,
        monthlyRevenue,
      },
    });
  } catch (error) {
    logger.error('Lỗi lấy thống kê phòng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê phòng',
    });
  }
});

module.exports = router;