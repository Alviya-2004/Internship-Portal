const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "React"
  domain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: true,
  },
});

module.exports = mongoose.model('Skill', skillSchema);
