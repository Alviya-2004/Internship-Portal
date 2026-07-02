const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "Web Development"
});

module.exports = mongoose.model('Domain', domainSchema);
