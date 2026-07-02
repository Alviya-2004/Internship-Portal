// models/Student.js  (backend only)
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: String,
  rollno: String,
});

module.exports = mongoose.model('Student', studentSchema);
