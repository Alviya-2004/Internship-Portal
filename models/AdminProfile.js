const mongoose = require('mongoose');

const adminProfileSchema = new mongoose.Schema({
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    required: true,
  },
  dept: String,
  email: String,
  phn: String,
}, { timestamps: true });

module.exports = mongoose.model('AdminProfile', adminProfileSchema);
