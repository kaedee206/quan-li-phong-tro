const mongoose = require('mongoose');
const validator = require('validator');

// Schema cho khách thuê
const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên khách thuê là bắt buộc'],
    trim: true,
    maxlength: [100, 'Tên không được vượt quá 100 ký tự'],
  },
  phone: {
    type: String,
    required: [true, 'Số điện thoại là bắt buộc'],
    unique: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{10,11}$/.test(v);
      },
      message: 'Số điện thoại không hợp lệ'
    },
  },
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Email không hợp lệ'],
  },
  idCard: {
    type: String,
    required: [true, 'Số CMND/CCCD là bắt buộc'],
    unique: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{9,12}$/.test(v);
      },
      message: 'Số CMND/CCCD không hợp lệ'
    },
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Ngày sinh là bắt buộc'],
    validate: {
      validator: function(v) {
        return v < new Date();
      },
      message: 'Ngày sinh phải nhỏ hơn ngày hiện tại'
    },
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Giới tính là bắt buộc'],
  },
  address: {
    street: {
      type: String,
      required: [true, 'Địa chỉ là bắt buộc'],
      trim: true,
    },
    ward: {
      type: String,
      required: [true, 'Phường/Xã là bắt buộc'],
      trim: true,
    },
    district: {
      type: String,
      required: [true, 'Quận/Huyện là bắt buộc'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'Tỉnh/Thành phố là bắt buộc'],
      trim: true,
    },
  },
  emergencyContact: {
    name: {
      type: String,
      required: [true, 'Tên người liên hệ khẩn cấp là bắt buộc'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Số điện thoại liên hệ khẩn cấp là bắt buộc'],
      validate: {
        validator: function(v) {
          return /^[0-9]{10,11}$/.test(v);
        },
        message: 'Số điện thoại liên hệ khẩn cấp không hợp lệ'
      },
    },
    relationship: {
      type: String,
      required: [true, 'Mối quan hệ với người liên hệ khẩn cấp là bắt buộc'],
      trim: true,
    },
  },
  occupation: {
    type: String,
    required: [true, 'Nghề nghiệp là bắt buộc'],
    trim: true,
  },
  workplace: {
    type: String,
    trim: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
  },
  moveInDate: {
    type: Date,
    default: null,
  },
  moveOutDate: {
    type: Date,
    default: null,
  },
  deposit: {
    type: Number,
    default: 0,
    min: [0, 'Tiền cọc phải lớn hơn hoặc bằng 0'],
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'moved_out'],
    default: 'active',
  },
  notes: {
    type: String,
    default: '',
  },
  documents: [{
    type: {
      type: String,
      enum: ['id_card', 'contract', 'photo', 'other'],
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
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index cho tìm kiếm
tenantSchema.index({ name: 'text', phone: 'text', email: 'text' });
tenantSchema.index({ phone: 1 });
tenantSchema.index({ email: 1 });
tenantSchema.index({ idCard: 1 });
tenantSchema.index({ status: 1 });

// Virtual populate cho contracts
tenantSchema.virtual('contracts', {
  ref: 'Contract',
  localField: '_id',
  foreignField: 'tenant',
});

// Virtual populate cho payments
tenantSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'tenant',
});

// Virtual cho tên đầy đủ
tenantSchema.virtual('fullAddress').get(function() {
  return `${this.address.street}, ${this.address.ward}, ${this.address.district}, ${this.address.city}`;
});

// Static method để tìm khách thuê đang hoạt động
tenantSchema.statics.findActive = function() {
  return this.find({ status: 'active', isActive: true });
};

// Instance method để kiểm tra khách thuê có phòng không
tenantSchema.methods.hasRoom = function() {
  return this.room && this.status === 'active';
};

// Middleware để cập nhật trạng thái phòng khi khách thuê thay đổi
tenantSchema.pre('save', async function(next) {
  if (this.isModified('room') || this.isModified('status')) {
    const Room = mongoose.model('Room');
    
    // Nếu khách thuê rời khỏi phòng
    if (this.status === 'moved_out' || this.status === 'inactive') {
      if (this.room) {
        await Room.findByIdAndUpdate(this.room, { 
          tenant: null, 
          status: 'available' 
        });
      }
    }
    // Nếu khách thuê vào phòng mới
    else if (this.room && this.status === 'active') {
      await Room.findByIdAndUpdate(this.room, { 
        tenant: this._id, 
        status: 'occupied' 
      });
    }
  }
  next();
});

// Toán tử JSON để loại bỏ trường nhạy cảm
tenantSchema.methods.toJSON = function() {
  const tenant = this.toObject();
  return tenant;
};

const Tenant = mongoose.model('Tenant', tenantSchema);

module.exports = Tenant;