const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },          // full name
  email: { type: String, required: true, unique: true }, // college email
  password: { type: String, required: true },      // simple plain password for mini project
  role: { type: String, enum: ['student', 'main_admin', 'dept_admin', 'faculty'], required: true }, // who they are
  department: { type: String }, // NEW
  resetOtp: { type: String },
  resetOtpExpiry: { type: Date },
  created_at: { type: Date, default: Date.now }, // NEW
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
