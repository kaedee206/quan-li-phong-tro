const mongoose = require('mongoose');

// Schema cho thanh toán
const paymentSchema = new mongoose.Schema({
  paymentCode: {
    type: String,
    required: [true, 'Mã thanh toán là bắt buộc'],
    unique: true,
    trim: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Phòng là bắt buộc'],
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Khách thuê là bắt buộc'],
  },
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: [true, 'Hợp đồng là bắt buộc'],
  },
  month: {
    type: Number,
    required: [true, 'Tháng là bắt buộc'],
    min: [1, 'Tháng phải từ 1-12'],
    max: [12, 'Tháng phải từ 1-12'],
  },
  year: {
    type: Number,
    required: [true, 'Năm là bắt buộc'],
    min: [2020, 'Năm phải từ 2020 trở lên'],
  },
  dueDate: {
    type: Date,
    required: [true, 'Ngày hạn thanh toán là bắt buộc'],
  },
  paidDate: {
    type: Date,
    default: null,
  },
  
  // Chi tiết thanh toán
  rentAmount: {
    type: Number,
    required: [true, 'Tiền thuê phòng là bắt buộc'],
    min: [0, 'Tiền thuê phòng phải lớn hơn hoặc bằng 0'],
  },
  
  // Điện nước
  electricityUsage: {
    type: Number,
    required: [true, 'Số điện sử dụng là bắt buộc'],
    min: [0, 'Số điện phải lớn hơn hoặc bằng 0'],
  },
  electricityPrice: {
    type: Number,
    default: 3000,
    min: [0, 'Giá điện phải lớn hơn hoặc bằng 0'],
  },
  electricityAmount: {
    type: Number,
    required: [true, 'Tiền điện là bắt buộc'],
    min: [0, 'Tiền điện phải lớn hơn hoặc bằng 0'],
  },
  
  waterUsage: {
    type: Number,
    required: [true, 'Số nước sử dụng là bắt buộc'],
    min: [0, 'Số nước phải lớn hơn hoặc bằng 0'],
  },
  waterPrice: {
    type: Number,
    default: 5000,
    min: [0, 'Giá nước phải lớn hơn hoặc bằng 0'],
  },
  waterAmount: {
    type: Number,
    required: [true, 'Tiền nước là bắt buộc'],
    min: [0, 'Tiền nước phải lớn hơn hoặc bằng 0'],
  },
  
  // Dịch vụ khác
  internetAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tiền internet phải lớn hơn hoặc bằng 0'],
  },
  parkingAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tiền gửi xe phải lớn hơn hoặc bằng 0'],
  },
  cleaningAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tiền vệ sinh phải lớn hơn hoặc bằng 0'],
  },
  
  // Phí khác
  otherFees: [{
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Số tiền phải lớn hơn hoặc bằng 0'],
    },
  }],
  
  // Giảm giá
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Giảm giá phải lớn hơn hoặc bằng 0'],
  },
  discountReason: {
    type: String,
    trim: true,
  },
  
  // Tổng tiền
  totalAmount: {
    type: Number,
    required: [true, 'Tổng tiền là bắt buộc'],
    min: [0, 'Tổng tiền phải lớn hơn hoặc bằng 0'],
  },
  
  // Trạng thái thanh toán
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending',
  },
  
  // Phương thức thanh toán
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'qr_code', 'other'],
    default: 'cash',
  },
  
  // Thông tin chuyển khoản
  bankTransfer: {
    bankName: String,
    accountNumber: String,
    transferCode: String,
    transferDate: Date,
  },
  
  // Ghi chú
  notes: {
    type: String,
    default: '',
  },
  
  // Người thu tiền
  collectedBy: {
    type: String,
    default: 'Admin',
    trim: true,
  },
  
  // Ảnh chụp hóa đơn/chứng từ
  receipts: [{
    url: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Lịch sử thay đổi
  statusHistory: [{
    status: {
      type: String,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: String,
      default: 'Admin',
    },
    reason: {
      type: String,
      trim: true,
    },
  }],
  
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index cho tìm kiếm và sắp xếp
paymentSchema.index({ paymentCode: 1 });
paymentSchema.index({ room: 1 });
paymentSchema.index({ tenant: 1 });
paymentSchema.index({ contract: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ month: 1, year: 1 });
paymentSchema.index({ dueDate: 1 });
paymentSchema.index({ paidDate: 1 });

// Virtual cho trạng thái thanh toán
paymentSchema.virtual('paymentStatus').get(function() {
  const now = new Date();
  
  if (this.status === 'paid') return 'paid';
  if (this.status === 'cancelled') return 'cancelled';
  if (this.dueDate < now) return 'overdue';
  return 'pending';
});

// Virtual cho số ngày quá hạn
paymentSchema.virtual('daysOverdue').get(function() {
  if (this.status === 'paid' || this.status === 'cancelled') return 0;
  
  const now = new Date();
  if (this.dueDate >= now) return 0;
  
  const diffTime = Math.abs(now - this.dueDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Static method để tìm thanh toán quá hạn
paymentSchema.statics.findOverdue = function() {
  return this.find({
    status: 'pending',
    dueDate: { $lt: new Date() },
    isActive: true
  }).populate('room tenant contract');
};

// Static method để tìm thanh toán sắp đến hạn
paymentSchema.statics.findDueSoon = function(days = 3) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'pending',
    dueDate: { $lte: futureDate },
    isActive: true
  }).populate('room tenant contract');
};

// Instance method để đánh dấu đã thanh toán
paymentSchema.methods.markAsPaid = function(paymentMethod = 'cash', notes = '') {
  this.status = 'paid';
  this.paidDate = new Date();
  this.paymentMethod = paymentMethod;
  if (notes) this.notes = notes;
  
  this.statusHistory.push({
    status: 'paid',
    reason: 'Thanh toán thành công'
  });
  
  return this.save();
};

// Middleware để tự động tính tổng tiền
paymentSchema.pre('save', function(next) {
  // Tính tổng tiền các dịch vụ khác
  const otherFeesTotal = this.otherFees.reduce((sum, fee) => sum + fee.amount, 0);
  
  // Tính tổng tiền
  this.totalAmount = this.rentAmount + 
                    this.electricityAmount + 
                    this.waterAmount + 
                    this.internetAmount + 
                    this.parkingAmount + 
                    this.cleaningAmount + 
                    otherFeesTotal - 
                    this.discount;
  
  // Cập nhật trạng thái nếu quá hạn
  if (this.status === 'pending' && this.dueDate < new Date()) {
    this.status = 'overdue';
  }
  
  next();
});

// Middleware để tự động tạo mã thanh toán
paymentSchema.pre('save', async function(next) {
  if (this.isNew && !this.paymentCode) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    const month = String(this.month).padStart(2, '0');
    this.paymentCode = `TT${year}${month}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;