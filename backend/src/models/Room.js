const mongoose = require('mongoose');

// Schema cho phòng trọ
const roomSchema = new mongoose.Schema({
  number: {
    type: String,
    required: [true, 'Số phòng là bắt buộc'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Tên phòng là bắt buộc'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'reserved'],
    default: 'available',
    required: true,
  },
  price: {
    type: Number,
    required: [true, 'Giá phòng là bắt buộc'],
    min: [0, 'Giá phòng phải lớn hơn 0'],
  },
  area: {
    type: Number,
    required: [true, 'Diện tích phòng là bắt buộc'],
    min: [0, 'Diện tích phải lớn hơn 0'],
  },
  floor: {
    type: Number,
    required: [true, 'Tầng là bắt buộc'],
    min: [1, 'Tầng phải từ 1 trở lên'],
  },
  images: [{
    url: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      default: '',
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  }],
  amenities: {
    hasWifi: { type: Boolean, default: false },
    hasAirConditioner: { type: Boolean, default: false },
    hasRefrigerator: { type: Boolean, default: false },
    hasWashingMachine: { type: Boolean, default: false },
    hasBalcony: { type: Boolean, default: false },
    hasPrivateBathroom: { type: Boolean, default: false },
  },
  description: {
    type: String,
    default: '',
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index cho tìm kiếm và sắp xếp
roomSchema.index({ number: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ price: 1 });
roomSchema.index({ floor: 1 });

// Virtual populate cho contracts
roomSchema.virtual('contracts', {
  ref: 'Contract',
  localField: '_id',
  foreignField: 'room',
});

// Virtual populate cho payments
roomSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'room',
});

// Middleware để cập nhật trạng thái phòng
roomSchema.pre('save', function(next) {
  if (this.tenant && this.status === 'available') {
    this.status = 'occupied';
  } else if (!this.tenant && this.status === 'occupied') {
    this.status = 'available';
  }
  next();
});

// Static method để tìm phòng trống
roomSchema.statics.findAvailable = function() {
  return this.find({ status: 'available', isActive: true });
};

// Instance method để kiểm tra phòng có khách không
roomSchema.methods.isOccupied = function() {
  return this.status === 'occupied' && this.tenant;
};

// Toán tử JSON để loại bỏ trường nhạy cảm
roomSchema.methods.toJSON = function() {
  const room = this.toObject();
  return room;
};

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;