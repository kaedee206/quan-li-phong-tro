const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Room = require('../models/Room');
const Tenant = require('../models/Tenant');
const Contract = require('../models/Contract');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình multer cho upload hóa đơn
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/payments');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
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

// GET /api/payments - Lấy danh sách thanh toán
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      roomId,
      tenantId,
      contractId,
      month,
      year,
      search,
      sortBy = 'dueDate',
      sortOrder = 'desc'
    } = req.query;

    // Tạo filter object
    const filter = { isActive: true };
    
    if (status) filter.status = status;
    if (roomId) filter.room = roomId;
    if (tenantId) filter.tenant = tenantId;
    if (contractId) filter.contract = contractId;
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    // Tạo sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Tính toán pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Payment.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Lấy dữ liệu
    let query = Payment.find(filter)
      .populate('room', 'number name floor')
      .populate('tenant', 'name phone email')
      .populate('contract', 'contractNumber')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Thêm tìm kiếm text nếu có
    if (search) {
      query = query.where({
        $or: [
          { paymentCode: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const payments = await query.exec();

    logger.info(`Lấy danh sách thanh toán - Trang ${page}, Tìm thấy ${payments.length}/${total} thanh toán`);

    res.json({
      success: true,
      data: payments,
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
    logger.error('Lỗi lấy danh sách thanh toán:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách thanh toán',
    });
  }
});

// GET /api/payments/overdue - Lấy thanh toán quá hạn
router.get('/overdue', async (req, res) => {
  try {
    const payments = await Payment.findOverdue();

    logger.info(`Lấy thanh toán quá hạn - Tìm thấy ${payments.length} thanh toán`);

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    logger.error('Lỗi lấy thanh toán quá hạn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thanh toán quá hạn',
    });
  }
});

// GET /api/payments/due-soon - Lấy thanh toán sắp đến hạn
router.get('/due-soon', async (req, res) => {
  try {
    const { days = 3 } = req.query;
    const payments = await Payment.findDueSoon(parseInt(days));

    logger.info(`Lấy thanh toán sắp đến hạn trong ${days} ngày - Tìm thấy ${payments.length} thanh toán`);

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    logger.error('Lỗi lấy thanh toán sắp đến hạn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thanh toán sắp đến hạn',
    });
  }
});

// GET /api/payments/:id - Lấy thông tin chi tiết thanh toán
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('room', 'number name floor status price')
      .populate('tenant', 'name phone email idCard')
      .populate('contract', 'contractNumber monthlyRent electricityPrice waterPrice');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thanh toán',
      });
    }

    logger.info(`Lấy thông tin thanh toán ${payment.paymentCode}`);

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error('Lỗi lấy thông tin thanh toán:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin thanh toán',
    });
  }
});

// POST /api/payments - Tạo thanh toán mới
router.post('/', upload.array('receipts', 5), async (req, res) => {
  try {
    const paymentData = req.body;
    
    // Kiểm tra phòng, khách thuê và hợp đồng có tồn tại không
    const room = await Room.findById(paymentData.room);
    const tenant = await Tenant.findById(paymentData.tenant);
    const contract = await Contract.findById(paymentData.contract);
    
    if (!room || !tenant || !contract) {
      return res.status(400).json({
        success: false,
        message: 'Phòng, khách thuê hoặc hợp đồng không tồn tại',
      });
    }

    // Tự động tính tiền điện và nước
    paymentData.electricityAmount = paymentData.electricityUsage * paymentData.electricityPrice;
    paymentData.waterAmount = paymentData.waterUsage * paymentData.waterPrice;

    // Xử lý otherFees
    if (req.body.otherFees) {
      if (typeof req.body.otherFees === 'string') {
        paymentData.otherFees = JSON.parse(req.body.otherFees);
      }
    }

    // Xử lý bankTransfer
    if (req.body.bankTransfer) {
      if (typeof req.body.bankTransfer === 'string') {
        paymentData.bankTransfer = JSON.parse(req.body.bankTransfer);
      }
    }

    // Xử lý hình ảnh upload
    if (req.files && req.files.length > 0) {
      paymentData.receipts = req.files.map(file => ({
        url: `/uploads/payments/${file.filename}`,
        description: 'Hóa đơn thanh toán',
      }));
    }

    const payment = new Payment(paymentData);
    await payment.save();

    logger.info(`Tạo thanh toán mới: ${payment.paymentCode}`);

    res.status(201).json({
      success: true,
      message: 'Tạo thanh toán mới thành công',
      data: payment,
    });
  } catch (error) {
    logger.error('Lỗi tạo thanh toán mới:', error);
    
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
      message: 'Lỗi khi tạo thanh toán mới',
      error: error.message,
    });
  }
});

// PUT /api/payments/:id - Cập nhật thanh toán
router.put('/:id', upload.array('receipts', 5), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thanh toán',
      });
    }

    const updateData = req.body;
    
    // Tự động tính lại tiền điện và nước nếu có thay đổi
    if (updateData.electricityUsage || updateData.electricityPrice) {
      updateData.electricityAmount = (updateData.electricityUsage || payment.electricityUsage) * 
                                    (updateData.electricityPrice || payment.electricityPrice);
    }
    
    if (updateData.waterUsage || updateData.waterPrice) {
      updateData.waterAmount = (updateData.waterUsage || payment.waterUsage) * 
                              (updateData.waterPrice || payment.waterPrice);
    }

    // Xử lý otherFees
    if (req.body.otherFees) {
      if (typeof req.body.otherFees === 'string') {
        updateData.otherFees = JSON.parse(req.body.otherFees);
      }
    }

    // Xử lý bankTransfer
    if (req.body.bankTransfer) {
      if (typeof req.body.bankTransfer === 'string') {
        updateData.bankTransfer = JSON.parse(req.body.bankTransfer);
      }
    }

    // Xử lý hình ảnh upload mới
    if (req.files && req.files.length > 0) {
      const newReceipts = req.files.map(file => ({
        url: `/uploads/payments/${file.filename}`,
        description: 'Hóa đơn thanh toán',
      }));
      
      // Thêm hình ảnh mới vào danh sách hình ảnh hiện tại
      updateData.receipts = [...payment.receipts, ...newReceipts];
    }

    // Cập nhật thanh toán
    Object.assign(payment, updateData);
    await payment.save();

    logger.info(`Cập nhật thanh toán: ${payment.paymentCode}`);

    res.json({
      success: true,
      message: 'Cập nhật thanh toán thành công',
      data: payment,
    });
  } catch (error) {
    logger.error('Lỗi cập nhật thanh toán:', error);
    
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
      message: 'Lỗi khi cập nhật thanh toán',
      error: error.message,
    });
  }
});

// PUT /api/payments/:id/pay - Đánh dấu thanh toán đã thanh toán
router.put('/:id/pay', async (req, res) => {
  try {
    const { paymentMethod = 'cash', notes = '' } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thanh toán',
      });
    }

    if (payment.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Thanh toán đã được thanh toán',
      });
    }

    await payment.markAsPaid(paymentMethod, notes);

    logger.info(`Đánh dấu thanh toán đã thanh toán: ${payment.paymentCode}`);

    res.json({
      success: true,
      message: 'Đánh dấu thanh toán thành công',
      data: payment,
    });
  } catch (error) {
    logger.error('Lỗi đánh dấu thanh toán:', error);
    res.status(400).json({
      success: false,
      message: 'Lỗi khi đánh dấu thanh toán',
      error: error.message,
    });
  }
});

// PUT /api/payments/:id/cancel - Hủy thanh toán
router.put('/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thanh toán',
      });
    }

    if (payment.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Không thể hủy thanh toán đã thanh toán',
      });
    }

    payment.status = 'cancelled';
    payment.notes = payment.notes + (reason ? `\nLý do hủy: ${reason}` : '');
    
    payment.statusHistory.push({
      status: 'cancelled',
      reason: reason || 'Hủy thanh toán'
    });

    await payment.save();

    logger.info(`Hủy thanh toán: ${payment.paymentCode}`);

    res.json({
      success: true,
      message: 'Hủy thanh toán thành công',
      data: payment,
    });
  } catch (error) {
    logger.error('Lỗi hủy thanh toán:', error);
    res.status(400).json({
      success: false,
      message: 'Lỗi khi hủy thanh toán',
      error: error.message,
    });
  }
});

// DELETE /api/payments/:id - Xóa thanh toán
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thanh toán',
      });
    }

    if (payment.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa thanh toán đã thanh toán',
      });
    }

    // Soft delete
    payment.isActive = false;
    await payment.save();

    logger.info(`Xóa thanh toán: ${payment.paymentCode}`);

    res.json({
      success: true,
      message: 'Xóa thanh toán thành công',
    });
  } catch (error) {
    logger.error('Lỗi xóa thanh toán:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa thanh toán',
    });
  }
});

// DELETE /api/payments/:id/receipt/:receiptIndex - Xóa hóa đơn của thanh toán
router.delete('/:id/receipt/:receiptIndex', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    const receiptIndex = parseInt(req.params.receiptIndex);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thanh toán',
      });
    }

    if (receiptIndex < 0 || receiptIndex >= payment.receipts.length) {
      return res.status(400).json({
        success: false,
        message: 'Index hóa đơn không hợp lệ',
      });
    }

    // Lấy đường dẫn file
    const receiptUrl = payment.receipts[receiptIndex].url;
    const filePath = path.join(__dirname, '../../', receiptUrl);

    // Xóa file khỏi hệ thống
    fs.unlink(filePath, (err) => {
      if (err) {
        logger.error('Lỗi xóa file hóa đơn:', err);
      }
    });

    // Xóa khỏi database
    payment.receipts.splice(receiptIndex, 1);
    await payment.save();

    logger.info(`Xóa hóa đơn của thanh toán ${payment.paymentCode}`);

    res.json({
      success: true,
      message: 'Xóa hóa đơn thành công',
    });
  } catch (error) {
    logger.error('Lỗi xóa hóa đơn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa hóa đơn',
    });
  }
});

// POST /api/payments/bulk-create - Tạo thanh toán hàng loạt
router.post('/bulk-create', async (req, res) => {
  try {
    const { month, year, roomIds = [] } = req.body;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Tháng và năm là bắt buộc',
      });
    }

    let contracts;
    if (roomIds.length > 0) {
      contracts = await Contract.find({
        room: { $in: roomIds },
        status: 'active',
        isActive: true
      }).populate('room tenant');
    } else {
      contracts = await Contract.find({
        status: 'active',
        isActive: true
      }).populate('room tenant');
    }

    const createdPayments = [];
    const errors = [];

    for (const contract of contracts) {
      try {
        // Kiểm tra xem đã có thanh toán cho tháng này chưa
        const existingPayment = await Payment.findOne({
          contract: contract._id,
          month: parseInt(month),
          year: parseInt(year)
        });

        if (existingPayment) {
          errors.push({
            contractNumber: contract.contractNumber,
            room: contract.room.number,
            message: 'Đã có thanh toán cho tháng này'
          });
          continue;
        }

        // Tạo thanh toán mới
        const payment = new Payment({
          room: contract.room._id,
          tenant: contract.tenant._id,
          contract: contract._id,
          month: parseInt(month),
          year: parseInt(year),
          dueDate: new Date(parseInt(year), parseInt(month) - 1, contract.paymentDay),
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

        await payment.save();
        createdPayments.push(payment);

      } catch (error) {
        errors.push({
          contractNumber: contract.contractNumber,
          room: contract.room.number,
          message: error.message
        });
      }
    }

    logger.info(`Tạo thanh toán hàng loạt - Thành công: ${createdPayments.length}, Lỗi: ${errors.length}`);

    res.json({
      success: true,
      message: `Tạo thanh toán hàng loạt thành công`,
      data: {
        created: createdPayments.length,
        errors: errors.length,
        payments: createdPayments,
        errorDetails: errors
      }
    });
  } catch (error) {
    logger.error('Lỗi tạo thanh toán hàng loạt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo thanh toán hàng loạt',
      error: error.message
    });
  }
});

// GET /api/payments/stats - Thống kê thanh toán
router.get('/stats/overview', async (req, res) => {
  try {
    const totalPayments = await Payment.countDocuments({ isActive: true });
    const paidPayments = await Payment.countDocuments({ status: 'paid', isActive: true });
    const pendingPayments = await Payment.countDocuments({ status: 'pending', isActive: true });
    const overduePayments = await Payment.countDocuments({ status: 'overdue', isActive: true });
    const cancelledPayments = await Payment.countDocuments({ status: 'cancelled', isActive: true });

    // Tổng doanh thu
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'paid', isActive: true } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Doanh thu tháng hiện tại
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = await Payment.aggregate([
      { 
        $match: { 
          status: 'paid', 
          month: currentMonth, 
          year: currentYear, 
          isActive: true 
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Thống kê theo tháng
    const monthlyStats = await Payment.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: { year: '$year', month: '$month' },
          total: { $sum: 1 },
          paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0] } },
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Thống kê theo phương thức thanh toán
    const paymentMethodStats = await Payment.aggregate([
      { $match: { status: 'paid', isActive: true } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    logger.info('Lấy thống kê thanh toán');

    res.json({
      success: true,
      data: {
        overview: {
          totalPayments,
          paidPayments,
          pendingPayments,
          overduePayments,
          cancelledPayments,
          totalRevenue: totalRevenue[0]?.total || 0,
          monthlyRevenue: monthlyRevenue[0]?.total || 0,
          paymentRate: totalPayments > 0 ? ((paidPayments / totalPayments) * 100).toFixed(1) : 0,
        },
        monthlyStats,
        paymentMethodStats,
      },
    });
  } catch (error) {
    logger.error('Lỗi lấy thống kê thanh toán:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê thanh toán',
    });
  }
});

module.exports = router;