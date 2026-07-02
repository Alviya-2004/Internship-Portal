const mongoose = require('mongoose');

const facultyProfileSchema = new mongoose.Schema({
  // FK to User (faculty)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    required: true,
  },
  fac_id: {                // if you want a college ID like FAC001
    type: String,
    unique: true,
  },
  dept: String,
  designation: String, // NEW
  phone: String,
  email: String,           // usually same as User.email, but kept for convenience
}, { timestamps: true });

module.exports = mongoose.model('FacultyProfile', facultyProfileSchema);
