const mongoose = require('mongoose');

const staffFeedbackSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  memberName: {
    type: String,
    required: true
  },
  memberEmail: {
    type: String,
    required: true
  },
  feedbackFor: {
    type: String,
    enum: ['server', 'waiter', 'cook', 'general'],
    required: true
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    default: null
  },
  staffName: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  feedback: {
    type: String,
    required: true,
    maxlength: 1000
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  branchName: {
    type: String,
    default: ''
  },
  orderNumber: {
    type: String,
    default: null
  },
  tableNumber: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
staffFeedbackSchema.index({ memberId: 1 });
staffFeedbackSchema.index({ feedbackFor: 1 });
staffFeedbackSchema.index({ status: 1 });
staffFeedbackSchema.index({ createdAt: -1 });
staffFeedbackSchema.index({ rating: 1 });

module.exports = mongoose.model('StaffFeedback', staffFeedbackSchema);
