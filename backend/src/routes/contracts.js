const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình multer cho upload hợp đồng
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/contracts');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'contract-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép file PDF hoặc hình ảnh (JPEG, PNG)'));
    }
  }
});

// GET /api/contracts - Lấy danh sách hợp đồng
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      roomId,
      tenantId,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Tạo filter object
    const filter = { isActive: true };
    
    if (status) filter.status = status;
    if (roomId) filter.room = roomId;
    if (tenantId) filter.tenant = tenantId;
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    // Tạo sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Tính toán pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Contract.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Lấy dữ liệu
    let query = Contract.find(filter)
      .populate('room', 'number name floor status')
      .populate('tenant', 'name phone email idCard')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Thêm tìm kiếm text nếu có
    if (search) {
      query = query.where({
        $or: [
          { contractNumber: { $regex: search, $options: 'i' } },
          { terms: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const contracts = await query.exec();

    logger.info(`Lấy danh sách hợp đồng - Trang ${page}, Tìm thấy ${contracts.length}/${total} hợp đồng`);

    res.json({
      success: true,
      data: contracts,
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
    logger.error('Lỗi lấy danh sách hợp đồng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách hợp đồng',
    });
  }
});

// GET /api/contracts/expiring - Lấy hợp đồng sắp hết hạn
router.get('/expiring', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const contracts = await Contract.findExpiringSoon(parseInt(days));

    logger.info(`Lấy hợp đồng sắp hết hạn trong ${days} ngày - Tìm thấy ${contracts.length} hợp đồng`);

    res.json({
      success: true,
      data: contracts,
    });
  } catch (error) {
    logger.error('Lỗi lấy hợp đồng sắp hết hạn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy hợp đồng sắp hết hạn',
    });
  }
});

// GET /api/contracts/expired - Lấy hợp đồng đã hết hạn
router.get('/expired', async (req, res) => {
  try {
    const contracts = await Contract.findExpired();

    logger.info(`Lấy hợp đồng đã hết hạn - Tìm thấy ${contracts.length} hợp đồng`);

    res.json({
      success: true,
      data: contracts,
    });
  } catch (error) {
    logger.error('Lỗi lấy hợp đồng đã hết hạn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy hợp đồng đã hết hạn',
    });
  }
});

// GET /api/contracts/:id - Lấy thông tin chi tiết hợp đồng
router.get('/:id', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('room', 'number name floor status price area amenities')
      .populate('tenant', 'name phone email idCard address emergencyContact')
      .populate({
        path: 'payments',
        populate: {
          path: 'room tenant',
          select: 'number name phone'
        }
      });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng',
      });
    }

    logger.info(`Lấy thông tin hợp đồng ${contract.contractNumber}`);

    res.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    logger.error('Lỗi lấy thông tin hợp đồng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin hợp đồng',
    });
  }
});

// POST /api/contracts - Tạo hợp đồng mới
router.post('/', upload.array('documents', 5), async (req, res) => {
  try {
    const contractData = req.body;
    
    // Kiểm tra phòng và khách thuê có tồn tại không
    const room = await Room.findById(contractData.room);
    const tenant = await Tenant.findById(contractData.tenant);
    
    if (!room || !tenant) {
      return res.status(400).json({
        success: false,
        message: 'Phòng hoặc khách thuê không tồn tại',
      });
    }

    // Kiểm tra phòng có đang trống không
    if (room.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Phòng không có sẵn để tạo hợp đồng',
      });
    }

    // Xử lý dữ liệu JSON
    if (req.body.rules) {
      if (typeof req.body.rules === 'string') {
        contractData.rules = JSON.parse(req.body.rules);
      }
    }

    if (req.body.witnesses) {
      if (typeof req.body.witnesses === 'string') {
        contractData.witnesses = JSON.parse(req.body.witnesses);
      }
    }

    // Xử lý tài liệu upload
    if (req.files && req.files.length > 0) {
      contractData.documents = req.files.map(file => ({
        type: 'contract',
        url: `/uploads/contracts/${file.filename}`,
        name: file.originalname,
      }));
    }

    const contract = new Contract(contractData);
    await contract.save();

    // Cập nhật trạng thái phòng và khách thuê
    room.tenant = tenant._id;
    room.status = 'occupied';
    await room.save();

    tenant.room = room._id;
    tenant.status = 'active';
    tenant.moveInDate = contract.startDate;
    await tenant.save();

    // Tạo thanh toán đầu tiên
    const firstPayment = new Payment({
      room: room._id,
      tenant: tenant._id,
      contract: contract._id,
      month: contract.startDate.getMonth() + 1,
      year: contract.startDate.getFullYear(),
      dueDate: new Date(contract.startDate.getFullYear(), contract.startDate.getMonth(), contract.paymentDay),
      rentAmount: contract.monthlyRent,
      electricityUsage: 0,
      electricityPrice: contract.electricityPrice,
      electricityAmount: 0,
      waterUsage: 0,
      waterPrice: contract.waterPrice,
      waterAmount: 0,
      internetAmount: contract.internetPrice,
      parkingAmount: contract.parkingPrice,
      cleaningAmount: contract.cleaningPrice,
    });
    await firstPayment.save();

    logger.info(`Tạo hợp đồng mới: ${contract.contractNumber}`);

    res.status(201).json({
      success: true,
      message: 'Tạo hợp đồng mới thành công',
      data: contract,
    });
  } catch (error) {
    logger.error('Lỗi tạo hợp đồng mới:', error);
    
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
      message: 'Lỗi khi tạo hợp đồng mới',
      error: error.message,
    });
  }
});

// PUT /api/contracts/:id - Cập nhật hợp đồng
router.put('/:id', upload.array('documents', 5), async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng',
      });
    }

    const updateData = req.body;
    
    // Xử lý dữ liệu JSON
    if (req.body.rules) {
      if (typeof req.body.rules === 'string') {
        updateData.rules = JSON.parse(req.body.rules);
      }
    }

    if (req.body.witnesses) {
      if (typeof req.body.witnesses === 'string') {
        updateData.witnesses = JSON.parse(req.body.witnesses);
      }
    }

    // Xử lý tài liệu upload mới
    if (req.files && req.files.length > 0) {
      const newDocuments = req.files.map(file => ({
        type: 'contract',
        url: `/uploads/contracts/${file.filename}`,
        name: file.originalname,
      }));
      
      // Thêm tài liệu mới vào danh sách tài liệu hiện tại
      updateData.documents = [...contract.documents, ...newDocuments];
    }

    // Cập nhật hợp đồng
    Object.assign(contract, updateData);
    await contract.save();

    logger.info(`Cập nhật hợp đồng: ${contract.contractNumber}`);

    res.json({
      success: true,
      message: 'Cập nhật hợp đồng thành công',
      data: contract,
    });
  } catch (error) {
    logger.error('Lỗi cập nhật hợp đồng:', error);
    
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
      message: 'Lỗi khi cập nhật hợp đồng',
      error: error.message,
    });
  }
});

// PUT /api/contracts/:id/renew - Gia hạn hợp đồng
router.put('/:id/renew', async (req, res) => {
  try {
    const { newEndDate, reason } = req.body;
    
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng',
      });
    }

    if (contract.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể gia hạn hợp đồng đang hoạt động',
      });
    }

    await contract.renew(new Date(newEndDate), reason);

    logger.info(`Gia hạn hợp đồng: ${contract.contractNumber}`);

    res.json({
      success: true,
      message: 'Gia hạn hợp đồng thành công',
      data: contract,
    });
  } catch (error) {
    logger.error('Lỗi gia hạn hợp đồng:', error);
    res.status(400).json({
      success: false,
      message: 'Lỗi khi gia hạn hợp đồng',
      error: error.message,
    });
  }
});

// PUT /api/contracts/:id/terminate - Kết thúc hợp đồng
router.put('/:id/terminate', async (req, res) => {
  try {
    const { reason } = req.body;
    
    const contract = await Contract.findById(req.params.id)
      .populate('room')
      .populate('tenant');
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng',
      });
    }

    if (contract.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể kết thúc hợp đồng đang hoạt động',
      });
    }

    await contract.terminate(reason);

    // Cập nhật trạng thái phòng và khách thuê
    if (contract.room) {
      contract.room.tenant = null;
      contract.room.status = 'available';
      await contract.room.save();
    }

    if (contract.tenant) {
      contract.tenant.room = null;
      contract.tenant.status = 'moved_out';
      contract.tenant.moveOutDate = new Date();
      await contract.tenant.save();
    }

    logger.info(`Kết thúc hợp đồng: ${contract.contractNumber}`);

    res.json({
      success: true,
      message: 'Kết thúc hợp đồng thành công',
      data: contract,
    });
  } catch (error) {
    logger.error('Lỗi kết thúc hợp đồng:', error);
    res.status(400).json({
      success: false,
      message: 'Lỗi khi kết thúc hợp đồng',
      error: error.message,
    });
  }
});

// DELETE /api/contracts/:id - Xóa hợp đồng
router.delete('/:id', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng',
      });
    }

    if (contract.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa hợp đồng đang hoạt động',
      });
    }

    // Kiểm tra có thanh toán liên quan không
    const paymentCount = await Payment.countDocuments({ contract: contract._id });
    if (paymentCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa hợp đồng có thanh toán liên quan',
      });
    }

    // Soft delete
    contract.isActive = false;
    await contract.save();

    logger.info(`Xóa hợp đồng: ${contract.contractNumber}`);

    res.json({
      success: true,
      message: 'Xóa hợp đồng thành công',
    });
  } catch (error) {
    logger.error('Lỗi xóa hợp đồng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa hợp đồng',
    });
  }
});

// DELETE /api/contracts/:id/document/:documentIndex - Xóa tài liệu của hợp đồng
router.delete('/:id/document/:documentIndex', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    const documentIndex = parseInt(req.params.documentIndex);
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng',
      });
    }

    if (documentIndex < 0 || documentIndex >= contract.documents.length) {
      return res.status(400).json({
        success: false,
        message: 'Index tài liệu không hợp lệ',
      });
    }

    // Lấy đường dẫn file
    const documentUrl = contract.documents[documentIndex].url;
    const filePath = path.join(__dirname, '../../', documentUrl);

    // Xóa file khỏi hệ thống
    fs.unlink(filePath, (err) => {
      if (err) {
        logger.error('Lỗi xóa file tài liệu:', err);
      }
    });

    // Xóa khỏi database
    contract.documents.splice(documentIndex, 1);
    await contract.save();

    logger.info(`Xóa tài liệu của hợp đồng ${contract.contractNumber}`);

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

// GET /api/contracts/stats - Thống kê hợp đồng
router.get('/stats/overview', async (req, res) => {
  try {
    const totalContracts = await Contract.countDocuments({ isActive: true });
    const activeContracts = await Contract.countDocuments({ status: 'active', isActive: true });
    const expiredContracts = await Contract.countDocuments({ status: 'expired', isActive: true });
    const terminatedContracts = await Contract.countDocuments({ status: 'terminated', isActive: true });
    const renewedContracts = await Contract.countDocuments({ status: 'renewed', isActive: true });

    // Hợp đồng sắp hết hạn
    const expiringSoon = await Contract.countDocuments({
      status: 'active',
      endDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      isActive: true
    });

    // Thống kê theo tháng
    const monthlyStats = await Contract.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' }, 
            month: { $month: '$createdAt' } 
          },
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
          terminated: { $sum: { $cond: [{ $eq: ['$status', 'terminated'] }, 1, 0] } },
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Thống kê thời gian hợp đồng
    const durationStats = await Contract.aggregate([
      { $match: { isActive: true } },
      {
        $addFields: {
          duration: {
            $divide: [
              { $subtract: ['$endDate', '$startDate'] },
              1000 * 60 * 60 * 24 * 30 // Convert to months
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ['$duration', 6] }, then: 'under_6_months' },
                { case: { $lt: ['$duration', 12] }, then: '6_12_months' },
                { case: { $lt: ['$duration', 24] }, then: '1_2_years' },
                { case: { $gte: ['$duration', 24] }, then: 'over_2_years' }
              ],
              default: 'unknown'
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    logger.info('Lấy thống kê hợp đồng');

    res.json({
      success: true,
      data: {
        overview: {
          totalContracts,
          activeContracts,
          expiredContracts,
          terminatedContracts,
          renewedContracts,
          expiringSoon,
        },
        monthlyStats,
        durationStats,
      },
    });
  } catch (error) {
    logger.error('Lỗi lấy thống kê hợp đồng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê hợp đồng',
    });
  }
});

module.exports = router;