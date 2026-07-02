const mongoose = require('mongoose');

// models/Application.js
const applicationSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  internship_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
  
  department: String, // Can keep for easier querying despite normalization
  cgpa: Number,
  skills: [String],

  facultyApprovalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },

  status: {
    type: String,
    enum: ['Applied', 'Shortlisted', 'Rejected', 'Selected'],
    default: 'Applied',
  },

  applied_at: { type: Date, default: Date.now }, // Rename appliedAt to applied_at
});

module.exports = mongoose.model('Application', applicationSchema);
