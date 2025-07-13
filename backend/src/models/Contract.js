const mongoose = require('mongoose');

// Schema cho hợp đồng
const contractSchema = new mongoose.Schema({
  contractNumber: {
    type: String,
    required: [true, 'Số hợp đồng là bắt buộc'],
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
  startDate: {
    type: Date,
    required: [true, 'Ngày bắt đầu là bắt buộc'],
  },
  endDate: {
    type: Date,
    required: [true, 'Ngày kết thúc là bắt buộc'],
    validate: {
      validator: function(v) {
        return v > this.startDate;
      },
      message: 'Ngày kết thúc phải sau ngày bắt đầu'
    },
  },
  monthlyRent: {
    type: Number,
    required: [true, 'Tiền thuê hàng tháng là bắt buộc'],
    min: [0, 'Tiền thuê phải lớn hơn 0'],
  },
  deposit: {
    type: Number,
    required: [true, 'Tiền cọc là bắt buộc'],
    min: [0, 'Tiền cọc phải lớn hơn hoặc bằng 0'],
  },
  electricityPrice: {
    type: Number,
    default: 3000,
    min: [0, 'Giá điện phải lớn hơn hoặc bằng 0'],
  },
  waterPrice: {
    type: Number,
    default: 5000,
    min: [0, 'Giá nước phải lớn hơn hoặc bằng 0'],
  },
  internetPrice: {
    type: Number,
    default: 0,
    min: [0, 'Giá internet phải lớn hơn hoặc bằng 0'],
  },
  parkingPrice: {
    type: Number,
    default: 0,
    min: [0, 'Giá gửi xe phải lớn hơn hoặc bằng 0'],
  },
  cleaningPrice: {
    type: Number,
    default: 0,
    min: [0, 'Giá vệ sinh phải lớn hơn hoặc bằng 0'],
  },
  paymentDay: {
    type: Number,
    required: [true, 'Ngày thanh toán là bắt buộc'],
    min: [1, 'Ngày thanh toán phải từ 1-31'],
    max: [31, 'Ngày thanh toán phải từ 1-31'],
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'terminated', 'renewed'],
    default: 'active',
  },
  terms: {
    type: String,
    required: [true, 'Điều khoản hợp đồng là bắt buộc'],
  },
  rules: [{
    type: String,
    required: true,
  }],
  witnesses: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^[0-9]{10,11}$/.test(v);
        },
        message: 'Số điện thoại người làm chứng không hợp lệ'
      },
    },
    idCard: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^[0-9]{9,12}$/.test(v);
        },
        message: 'Số CMND/CCCD người làm chứng không hợp lệ'
      },
    },
  }],
  documents: [{
    type: {
      type: String,
      enum: ['contract', 'appendix', 'termination', 'renewal'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  renewalHistory: [{
    oldEndDate: {
      type: Date,
      required: true,
    },
    newEndDate: {
      type: Date,
      required: true,
    },
    renewalDate: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      trim: true,
    },
  }],
  terminationReason: {
    type: String,
    trim: true,
  },
  terminationDate: {
    type: Date,
  },
  notes: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index cho tìm kiếm và sắp xếp
contractSchema.index({ contractNumber: 1 });
contractSchema.index({ room: 1 });
contractSchema.index({ tenant: 1 });
contractSchema.index({ status: 1 });
contractSchema.index({ startDate: 1 });
contractSchema.index({ endDate: 1 });

// Virtual cho thời gian hợp đồng (tháng)
contractSchema.virtual('durationInMonths').get(function() {
  const diffTime = Math.abs(this.endDate - this.startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.ceil(diffDays / 30);
});

// Virtual cho tình trạng hợp đồng
contractSchema.virtual('contractStatus').get(function() {
  const now = new Date();
  const daysUntilEnd = Math.ceil((this.endDate - now) / (1000 * 60 * 60 * 24));
  
  if (this.status === 'terminated') return 'terminated';
  if (this.status === 'expired' || this.endDate < now) return 'expired';
  if (daysUntilEnd <= 30) return 'expiring_soon';
  return 'active';
});

// Static method để tìm hợp đồng sắp hết hạn
contractSchema.statics.findExpiringSoon = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'active',
    endDate: { $lte: futureDate },
    isActive: true
  }).populate('room tenant');
};

// Static method để tìm hợp đồng đã hết hạn
contractSchema.statics.findExpired = function() {
  return this.find({
    status: 'active',
    endDate: { $lt: new Date() },
    isActive: true
  }).populate('room tenant');
};

// Instance method để gia hạn hợp đồng
contractSchema.methods.renew = function(newEndDate, reason) {
  this.renewalHistory.push({
    oldEndDate: this.endDate,
    newEndDate: newEndDate,
    reason: reason || 'Gia hạn hợp đồng'
  });
  this.endDate = newEndDate;
  this.status = 'renewed';
  return this.save();
};

// Instance method để kết thúc hợp đồng
contractSchema.methods.terminate = function(reason) {
  this.status = 'terminated';
  this.terminationReason = reason;
  this.terminationDate = new Date();
  return this.save();
};

// Middleware để tự động cập nhật trạng thái hợp đồng
contractSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.endDate < now && this.status === 'active') {
    this.status = 'expired';
  }
  
  next();
});

// Middleware để tự động tạo số hợp đồng
contractSchema.pre('save', async function(next) {
  if (this.isNew && !this.contractNumber) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.contractNumber = `HD${year}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const Contract = mongoose.model('Contract', contractSchema);

module.exports = Contract;