const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['police', 'ambulance', 'fire', 'tourist_helpline', 'embassy', 'local_authority'],
    default: 'tourist_helpline'
  },
  countryCode: {
    type: String,
    default: '+91'
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);