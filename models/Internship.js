const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
  title: { type: String, required: true },
  admin_dept: { type: String }, // NEW admin/dept who posts it
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }, // NEW
  location: String,
  mode: String,          // Online / Onsite / Hybrid
  stipend: String,
  skill_set: [String],   // Like a title eg "web development with react"
  start_date: Date,      // NEW
  end_date: Date,        // NEW
  deadline: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Internship', internshipSchema);
