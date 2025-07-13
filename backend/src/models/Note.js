const mongoose = require('mongoose');

// Schema cho ghi chú cá nhân
const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tiêu đề ghi chú là bắt buộc'],
    trim: true,
    maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự'],
  },
  content: {
    type: String,
    required: [true, 'Nội dung ghi chú là bắt buộc'],
    trim: true,
  },
  category: {
    type: String,
    enum: ['general', 'tenant', 'room', 'payment', 'maintenance', 'reminder', 'important'],
    default: 'general',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  relatedTo: {
    type: {
      type: String,
      enum: ['room', 'tenant', 'contract', 'payment'],
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedTo.type',
    },
  },
  reminderDate: {
    type: Date,
    default: null,
  },
  isReminder: {
    type: Boolean,
    default: false,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  attachments: [{
    url: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
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
noteSchema.index({ title: 'text', content: 'text' });
noteSchema.index({ category: 1 });
noteSchema.index({ priority: 1 });
noteSchema.index({ tags: 1 });
noteSchema.index({ reminderDate: 1 });
noteSchema.index({ isCompleted: 1 });
noteSchema.index({ createdAt: -1 });

// Virtual cho trạng thái ghi chú
noteSchema.virtual('status').get(function() {
  if (this.isCompleted) return 'completed';
  if (this.isReminder && this.reminderDate) {
    const now = new Date();
    if (this.reminderDate <= now) return 'due';
    return 'scheduled';
  }
  return 'active';
});

// Static method để tìm ghi chú quan trọng
noteSchema.statics.findImportant = function() {
  return this.find({
    priority: { $in: ['high', 'urgent'] },
    isActive: true,
    isCompleted: false
  }).sort({ createdAt: -1 });
};

// Static method để tìm ghi chú cần nhắc nhở
noteSchema.statics.findDueReminders = function() {
  return this.find({
    isReminder: true,
    reminderDate: { $lte: new Date() },
    isActive: true,
    isCompleted: false
  }).sort({ reminderDate: 1 });
};

// Static method để tìm ghi chú theo danh mục
noteSchema.statics.findByCategory = function(category) {
  return this.find({
    category: category,
    isActive: true
  }).sort({ createdAt: -1 });
};

// Static method để tìm ghi chú theo tag
noteSchema.statics.findByTag = function(tag) {
  return this.find({
    tags: tag,
    isActive: true
  }).sort({ createdAt: -1 });
};

// Instance method để đánh dấu hoàn thành
noteSchema.methods.markAsCompleted = function() {
  this.isCompleted = true;
  this.completedAt = new Date();
  return this.save();
};

// Instance method để đặt nhắc nhở
noteSchema.methods.setReminder = function(date) {
  this.isReminder = true;
  this.reminderDate = date;
  return this.save();
};

// Instance method để hủy nhắc nhở
noteSchema.methods.cancelReminder = function() {
  this.isReminder = false;
  this.reminderDate = null;
  return this.save();
};

// Middleware để tự động cập nhật trạng thái reminder
noteSchema.pre('save', function(next) {
  if (this.isReminder && this.reminderDate && this.reminderDate <= new Date()) {
    // Ghi chú đã đến hạn nhắc nhở
    if (!this.isCompleted) {
      // Có thể gửi thông báo ở đây
    }
  }
  next();
});

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;