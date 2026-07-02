const mongoose = require('mongoose');

const studentMentorSchema = new mongoose.Schema({
  // one student profile
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentProfile',
    unique: true,         // one mentor per student
    required: true,
  },
  // one faculty profile
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FacultyProfile',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('StudentMentor', studentMentorSchema);
