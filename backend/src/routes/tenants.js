const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình multer cho upload tài liệu
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/tenants');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'tenant-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép file hình ảnh (JPEG, PNG, GIF) hoặc PDF'));
    }
  }
});

// GET /api/tenants - Lấy danh sách khách thuê
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search,
      roomId,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Tạo filter object
    const filter = { isActive: true };
    
    if (status) filter.status = status;
    if (roomId) filter.room = roomId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { idCard: { $regex: search, $options: 'i' } }
      ];
    }

    // Tạo sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Tính toán pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Tenant.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Lấy dữ liệu
    const tenants = await Tenant.find(filter)
      .populate('room', 'number name floor status')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    logger.info(`Lấy danh sách khách thuê - Trang ${page}, Tìm thấy ${tenants.length}/${total} khách thuê`);

    res.json({
      success: true,
      data: tenants,
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
    logger.error('Lỗi lấy danh sách khách thuê:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách khách thuê',
    });
  }
});

// GET /api/tenants/active - Lấy danh sách khách thuê đang hoạt động
router.get('/active', async (req, res) => {
  try {
    const tenants = await Tenant.findActive()
      .populate('room', 'number name floor')
      .sort({ name: 1 });

    logger.info(`Lấy danh sách khách thuê đang hoạt động - Tìm thấy ${tenants.length} khách thuê`);

    res.json({
      success: true,
      data: tenants,
    });
  } catch (error) {
    logger.error('Lỗi lấy danh sách khách thuê đang hoạt động:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách khách thuê đang hoạt động',
    });
  }
});

// GET /api/tenants/:id - Lấy thông tin chi tiết khách thuê
router.get('/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .populate('room', 'number name floor status price')
      .populate({
        path: 'contracts',
        populate: {
          path: 'room',
          select: 'number name floor'
        }
      })
      .populate({
        path: 'payments',
        populate: {
          path: 'room',
          select: 'number name'
        }
      });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách thuê',
      });
    }

    logger.info(`Lấy thông tin khách thuê ${tenant.name}`);

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    logger.error('Lỗi lấy thông tin khách thuê:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin khách thuê',
    });
  }
});

// POST /api/tenants - Tạo khách thuê mới
router.post('/', upload.array('documents', 5), async (req, res) => {
  try {
    const tenantData = req.body;
    
    // Xử lý address
    if (req.body.address) {
      if (typeof req.body.address === 'string') {
        tenantData.address = JSON.parse(req.body.address);
      }
    }

    // Xử lý emergencyContact
    if (req.body.emergencyContact) {
      if (typeof req.body.emergencyContact === 'string') {
        tenantData.emergencyContact = JSON.parse(req.body.emergencyContact);
      }
    }

    // Xử lý tài liệu upload
    if (req.files && req.files.length > 0) {
      tenantData.documents = req.files.map(file => ({
        type: file.fieldname.includes('id_card') ? 'id_card' : 'other',
        url: `/uploads/tenants/${file.filename}`,
        name: file.originalname,
      }));
    }

    const tenant = new Tenant(tenantData);
    await tenant.save();

    logger.info(`Tạo khách thuê mới: ${tenant.name}`);

    res.status(201).json({
      success: true,
      message: 'Tạo khách thuê mới thành công',
      data: tenant,
    });
  } catch (error) {
    logger.error('Lỗi tạo khách thuê mới:', error);
    
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
      message: 'Lỗi khi tạo khách thuê mới',
      error: error.message,
    });
  }
});

// PUT /api/tenants/:id - Cập nhật thông tin khách thuê
router.put('/:id', upload.array('documents', 5), async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách thuê',
      });
    }

    const updateData = req.body;
    
    // Xử lý address
    if (req.body.address) {
      if (typeof req.body.address === 'string') {
        updateData.address = JSON.parse(req.body.address);
      }
    }

    // Xử lý emergencyContact
    if (req.body.emergencyContact) {
      if (typeof req.body.emergencyContact === 'string') {
        updateData.emergencyContact = JSON.parse(req.body.emergencyContact);
      }
    }

    // Xử lý tài liệu upload mới
    if (req.files && req.files.length > 0) {
      const newDocuments = req.files.map(file => ({
        type: file.fieldname.includes('id_card') ? 'id_card' : 'other',
        url: `/uploads/tenants/${file.filename}`,
        name: file.originalname,
      }));
      
      // Thêm tài liệu mới vào danh sách tài liệu hiện tại
      updateData.documents = [...tenant.documents, ...newDocuments];
    }

    // Cập nhật khách thuê
    Object.assign(tenant, updateData);
    await tenant.save();

    logger.info(`Cập nhật khách thuê: ${tenant.name}`);

    res.json({
      success: true,
      message: 'Cập nhật khách thuê thành công',
      data: tenant,
    });
  } catch (error) {
    logger.error('Lỗi cập nhật khách thuê:', error);
    
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
      message: 'Lỗi khi cập nhật khách thuê',
      error: error.message,
    });
  }
});

// DELETE /api/tenants/:id - Xóa khách thuê
router.delete('/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách thuê',
      });
    }

    // Kiểm tra khách thuê có đang thuê phòng không
    if (tenant.room && tenant.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa khách thuê đang thuê phòng',
      });
    }

    // Kiểm tra có hợp đồng hoặc thanh toán liên quan không
    const contractCount = await Contract.countDocuments({ tenant: tenant._id });
    const paymentCount = await Payment.countDocuments({ tenant: tenant._id });

    if (contractCount > 0 || paymentCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa khách thuê có hợp đồng hoặc thanh toán liên quan',
      });
    }

    // Soft delete
    tenant.isActive = false;
    await tenant.save();

    logger.info(`Xóa khách thuê: ${tenant.name}`);

    res.json({
      success: true,
      message: 'Xóa khách thuê thành công',
    });
  } catch (error) {
    logger.error('Lỗi xóa khách thuê:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa khách thuê',
    });
  }
});

// PUT /api/tenants/:id/move-in - Chuyển khách thuê vào phòng
router.put('/:id/move-in', async (req, res) => {
  try {
    const { roomId, moveInDate } = req.body;
    
    const tenant = await Tenant.findById(req.params.id);
    const room = await Room.findById(roomId);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách thuê',
      });
    }

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng',
      });
    }

    if (room.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Phòng không có sẵn',
      });
    }

    // Cập nhật thông tin khách thuê
    tenant.room = roomId;
    tenant.moveInDate = moveInDate || new Date();
    tenant.status = 'active';
    await tenant.save();

    logger.info(`Khách thuê ${tenant.name} chuyển vào phòng ${room.number}`);

    res.json({
      success: true,
      message: 'Chuyển khách thuê vào phòng thành công',
      data: tenant,
    });
  } catch (error) {
    logger.error('Lỗi chuyển khách thuê vào phòng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi chuyển khách thuê vào phòng',
    });
  }
});

// PUT /api/tenants/:id/move-out - Chuyển khách thuê ra khỏi phòng
router.put('/:id/move-out', async (req, res) => {
  try {
    const { moveOutDate, reason } = req.body;
    
    const tenant = await Tenant.findById(req.params.id);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách thuê',
      });
    }

    if (!tenant.room) {
      return res.status(400).json({
        success: false,
        message: 'Khách thuê không đang thuê phòng nào',
      });
    }

    // Cập nhật thông tin khách thuê
    tenant.moveOutDate = moveOutDate || new Date();
    tenant.status = 'moved_out';
    tenant.notes = tenant.notes + (reason ? `\nLý do chuyển đi: ${reason}` : '');
    await tenant.save();

    logger.info(`Khách thuê ${tenant.name} chuyển ra khỏi phòng`);

    res.json({
      success: true,
      message: 'Chuyển khách thuê ra khỏi phòng thành công',
      data: tenant,
    });
  } catch (error) {
    logger.error('Lỗi chuyển khách thuê ra khỏi phòng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi chuyển khách thuê ra khỏi phòng',
    });
  }
});

// DELETE /api/tenants/:id/document/:documentIndex - Xóa tài liệu của khách thuê
router.delete('/:id/document/:documentIndex', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    const documentIndex = parseInt(req.params.documentIndex);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách thuê',
      });
    }

    if (documentIndex < 0 || documentIndex >= tenant.documents.length) {
      return res.status(400).json({
        success: false,
        message: 'Index tài liệu không hợp lệ',
      });
    }

    // Lấy đường dẫn file
    const documentUrl = tenant.documents[documentIndex].url;
    const filePath = path.join(__dirname, '../../', documentUrl);

    // Xóa file khỏi hệ thống
    fs.unlink(filePath, (err) => {
      if (err) {
        logger.error('Lỗi xóa file tài liệu:', err);
      }
    });

    // Xóa khỏi database
    tenant.documents.splice(documentIndex, 1);
    await tenant.save();

    logger.info(`Xóa tài liệu của khách thuê ${tenant.name}`);

    res.json({
      success: true,
      message: 'Xóa tài liệu thành công',
    });
  } catch (error) {
    logger.error('Lỗi xóa tài liệu:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa tài liệu',
    });
  }
});

// GET /api/tenants/stats - Thống kê khách thuê
router.get('/stats/overview', async (req, res) => {
  try {
    const totalTenants = await Tenant.countDocuments({ isActive: true });
    const activeTenants = await Tenant.countDocuments({ status: 'active', isActive: true });
    const inactiveTenants = await Tenant.countDocuments({ status: 'inactive', isActive: true });
    const movedOutTenants = await Tenant.countDocuments({ status: 'moved_out', isActive: true });

    // Thống kê theo giới tính
    const genderStats = await Tenant.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      }
    ]);

    // Thống kê theo độ tuổi
    const currentYear = new Date().getFullYear();
    const ageStats = await Tenant.aggregate([
      { $match: { isActive: true } },
      {
        $addFields: {
          age: { $subtract: [currentYear, { $year: '$dateOfBirth' }] }
        }
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ['$age', 25] }, then: 'under_25' },
                { case: { $lt: ['$age', 35] }, then: '25_35' },
                { case: { $lt: ['$age', 45] }, then: '35_45' },
                { case: { $gte: ['$age', 45] }, then: 'over_45' }
              ],
              default: 'unknown'
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Khách thuê mới trong tháng
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const newTenantsThisMonth = await Tenant.countDocuments({
      isActive: true,
      createdAt: { $gte: currentMonth }
    });

    logger.info('Lấy thống kê khách thuê');

    res.json({
      success: true,
      data: {
        overview: {
          totalTenants,
          activeTenants,
          inactiveTenants,
          movedOutTenants,
          newTenantsThisMonth,
        },
        genderStats,
        ageStats,
      },
    });
  } catch (error) {
    logger.error('Lỗi lấy thống kê khách thuê:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê khách thuê',
    });
  }
});

module.exports = router;