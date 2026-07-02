const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  admission_no: { type: String },
  dept: { type: String },
  batch: { type: String },
  sem: { type: Number },
  branch: { type: String },
  cgpa: { type: Number },
  phn: { type: String },
  
  // ADD THIS: domains array
  domains: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
  }],
  
  skills: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
  }],
  
  projects: [
    {
      title: String,
      description: String,
      link: String,
    },
  ],
  resume_url: String, // updated from resumeUrl
  githubUrl: String, 
  portfolioUrl: String,
  linkedin: String,   // NEW
}, { timestamps: true });

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
