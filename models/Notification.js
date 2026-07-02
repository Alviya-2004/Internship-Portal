const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  internship_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Internship',
    required: true
  },
  message: { 
    type: String, 
    required: true 
  },
  read_status: { 
    type: Boolean, 
    default: false 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
