const express = require('express');
const router = express.Router();
const config = require('../config/config');
const logger = require('../utils/logger');

// POST /api/qr/generate - Tạo QR code thanh toán
router.post('/generate', async (req, res) => {
  try {
    const { amount, roomId, tenantName, description } = req.body;

    if (!amount || !roomId || !tenantName) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền, ID phòng và tên khách thuê là bắt buộc',
      });
    }

    // Validate số tiền
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền phải là số dương',
      });
    }

    // Tạo URL QR code VietQR
    const qrUrl = `${config.qr.baseUrl}/${config.qr.bankCode}-${config.qr.accountNumber}-print.jpg`;
    const params = new URLSearchParams({
      amount: parsedAmount.toString(),
      accountName: config.qr.accountName,
      addInfo: description || `Thanh toan phong ${roomId} - ${tenantName}`,
    });

    const fullQrUrl = `${qrUrl}?${params.toString()}`;

    // Ghi log tạo QR
    logger.info(`Tạo QR thanh toán - Phòng: ${roomId}, Khách: ${tenantName}, Số tiền: ${parsedAmount}`);

    res.json({
      success: true,
      message: 'Tạo QR code thanh toán thành công',
      data: {
        qrUrl: fullQrUrl,
        amount: parsedAmount,
        accountNumber: config.qr.accountNumber,
        accountName: decodeURIComponent(config.qr.accountName),
        bankCode: config.qr.bankCode.toUpperCase(),
        description: description || `Thanh toan phong ${roomId} - ${tenantName}`,
        roomId,
        tenantName,
      },
    });
  } catch (error) {
    logger.error('Lỗi tạo QR code thanh toán:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo QR code thanh toán',
      error: error.message,
    });
  }
});

// POST /api/qr/payment - Tạo QR cho thanh toán cụ thể
router.post('/payment', async (req, res) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'ID thanh toán là bắt buộc',
      });
    }

    // Import Payment model
    const Payment = require('../models/Payment');
    
    // Lấy thông tin thanh toán
    const payment = await Payment.findById(paymentId)
      .populate('room', 'number name')
      .populate('tenant', 'name phone');

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

    // Tạo URL QR code
    const qrUrl = `${config.qr.baseUrl}/${config.qr.bankCode}-${config.qr.accountNumber}-print.jpg`;
    const description = `TT${payment.paymentCode} P${payment.room.number} ${payment.tenant.name}`;
    
    const params = new URLSearchParams({
      amount: payment.totalAmount.toString(),
      accountName: config.qr.accountName,
      addInfo: description,
    });

    const fullQrUrl = `${qrUrl}?${params.toString()}`;

    // Ghi log tạo QR
    logger.info(`Tạo QR cho thanh toán ${payment.paymentCode} - Số tiền: ${payment.totalAmount}`);

    res.json({
      success: true,
      message: 'Tạo QR code cho thanh toán thành công',
      data: {
        qrUrl: fullQrUrl,
        payment: {
          id: payment._id,
          code: payment.paymentCode,
          amount: payment.totalAmount,
          dueDate: payment.dueDate,
          room: payment.room,
          tenant: payment.tenant,
        },
        bankInfo: {
          accountNumber: config.qr.accountNumber,
          accountName: decodeURIComponent(config.qr.accountName),
          bankCode: config.qr.bankCode.toUpperCase(),
          bankName: getBankName(config.qr.bankCode),
        },
        description,
      },
    });
  } catch (error) {
    logger.error('Lỗi tạo QR cho thanh toán:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo QR cho thanh toán',
      error: error.message,
    });
  }
});

// POST /api/qr/batch - Tạo QR hàng loạt cho nhiều thanh toán
router.post('/batch', async (req, res) => {
  try {
    const { paymentIds } = req.body;

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách ID thanh toán không hợp lệ',
      });
    }

    // Import Payment model
    const Payment = require('../models/Payment');
    
    // Lấy thông tin các thanh toán
    const payments = await Payment.find({
      _id: { $in: paymentIds },
      status: { $ne: 'paid' }
    })
    .populate('room', 'number name')
    .populate('tenant', 'name phone');

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thanh toán hợp lệ',
      });
    }

    // Tạo QR cho từng thanh toán
    const qrCodes = payments.map(payment => {
      const qrUrl = `${config.qr.baseUrl}/${config.qr.bankCode}-${config.qr.accountNumber}-print.jpg`;
      const description = `TT${payment.paymentCode} P${payment.room.number} ${payment.tenant.name}`;
      
      const params = new URLSearchParams({
        amount: payment.totalAmount.toString(),
        accountName: config.qr.accountName,
        addInfo: description,
      });

      return {
        paymentId: payment._id,
        paymentCode: payment.paymentCode,
        qrUrl: `${qrUrl}?${params.toString()}`,
        amount: payment.totalAmount,
        room: payment.room,
        tenant: payment.tenant,
        description,
      };
    });

    // Ghi log tạo QR hàng loạt
    logger.info(`Tạo QR hàng loạt cho ${payments.length} thanh toán`);

    res.json({
      success: true,
      message: `Tạo QR code hàng loạt thành công cho ${payments.length} thanh toán`,
      data: {
        qrCodes,
        bankInfo: {
          accountNumber: config.qr.accountNumber,
          accountName: decodeURIComponent(config.qr.accountName),
          bankCode: config.qr.bankCode.toUpperCase(),
          bankName: getBankName(config.qr.bankCode),
        },
        total: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.totalAmount, 0),
      },
    });
  } catch (error) {
    logger.error('Lỗi tạo QR hàng loạt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo QR hàng loạt',
      error: error.message,
    });
  }
});

// GET /api/qr/banks - Lấy danh sách ngân hàng hỗ trợ
router.get('/banks', (req, res) => {
  try {
    const supportedBanks = [
      { code: 'vcb', name: 'Vietcombank', fullName: 'Ngân hàng TMCP Ngoại thương Việt Nam' },
      { code: 'bidv', name: 'BIDV', fullName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
      { code: 'vtb', name: 'Vietinbank', fullName: 'Ngân hàng TMCP Công thương Việt Nam' },
      { code: 'agribank', name: 'Agribank', fullName: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam' },
      { code: 'acb', name: 'ACB', fullName: 'Ngân hàng TMCP Á Châu' },
      { code: 'tcb', name: 'Techcombank', fullName: 'Ngân hàng TMCP Kỹ thương Việt Nam' },
      { code: 'mb', name: 'MBBank', fullName: 'Ngân hàng TMCP Quân đội' },
      { code: 'vpbank', name: 'VPBank', fullName: 'Ngân hàng TMCP Việt Nam Thịnh vượng' },
      { code: 'tpb', name: 'TPBank', fullName: 'Ngân hàng TMCP Tiên Phong' },
      { code: 'stb', name: 'Sacombank', fullName: 'Ngân hàng TMCP Sài Gòn Thương tín' },
    ];

    res.json({
      success: true,
      data: {
        banks: supportedBanks,
        current: {
          code: config.qr.bankCode,
          name: getBankName(config.qr.bankCode),
        },
        note: 'Chỉ hiển thị một số ngân hàng phổ biến. VietQR hỗ trợ hầu hết các ngân hàng tại Việt Nam.',
      },
    });
  } catch (error) {
    logger.error('Lỗi lấy danh sách ngân hàng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách ngân hàng',
      error: error.message,
    });
  }
});

// GET /api/qr/config - Lấy cấu hình QR hiện tại
router.get('/config', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        bankCode: config.qr.bankCode,
        bankName: getBankName(config.qr.bankCode),
        accountNumber: config.qr.accountNumber,
        accountName: decodeURIComponent(config.qr.accountName),
        baseUrl: config.qr.baseUrl,
        configured: !!(config.qr.bankCode && config.qr.accountNumber && config.qr.accountName),
      },
    });
  } catch (error) {
    logger.error('Lỗi lấy cấu hình QR:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy cấu hình QR',
      error: error.message,
    });
  }
});

// POST /api/qr/validate - Validate thông tin QR
router.post('/validate', (req, res) => {
  try {
    const { bankCode, accountNumber, accountName } = req.body;

    const errors = [];

    if (!bankCode) {
      errors.push('Mã ngân hàng là bắt buộc');
    }

    if (!accountNumber) {
      errors.push('Số tài khoản là bắt buộc');
    } else if (!/^[0-9]{6,20}$/.test(accountNumber)) {
      errors.push('Số tài khoản phải từ 6-20 chữ số');
    }

    if (!accountName) {
      errors.push('Tên tài khoản là bắt buộc');
    } else if (accountName.length < 2) {
      errors.push('Tên tài khoản phải có ít nhất 2 ký tự');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin không hợp lệ',
        errors,
      });
    }

    // Tạo URL test
    const testUrl = `${config.qr.baseUrl}/${bankCode}-${accountNumber}-print.jpg`;
    const params = new URLSearchParams({
      amount: '10000',
      accountName: encodeURIComponent(accountName),
      addInfo: 'Test QR Code',
    });

    res.json({
      success: true,
      message: 'Thông tin QR hợp lệ',
      data: {
        bankCode,
        bankName: getBankName(bankCode),
        accountNumber,
        accountName,
        testUrl: `${testUrl}?${params.toString()}`,
      },
    });
  } catch (error) {
    logger.error('Lỗi validate QR:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi validate QR',
      error: error.message,
    });
  }
});

// Helper function để lấy tên ngân hàng
function getBankName(bankCode) {
  const bankNames = {
    vcb: 'Vietcombank',
    bidv: 'BIDV',
    vtb: 'Vietinbank',
    agribank: 'Agribank',
    acb: 'ACB',
    tcb: 'Techcombank',
    mb: 'MBBank',
    vpbank: 'VPBank',
    tpb: 'TPBank',
    stb: 'Sacombank',
  };

  return bankNames[bankCode?.toLowerCase()] || 'Ngân hàng không xác định';
}

module.exports = router;