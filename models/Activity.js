// models/Tourist.js - मौजूदा models में add करें
const mongoose = require('mongoose');

const touristSchema = new mongoose.Schema({
  tourist_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  nationality: {
    type: String,
    trim: true
  },
  emergency_contacts: [{
    name: String,
    phone: String,
    relation: String
  }],
  current_location: {
    latitude: Number,
    longitude: Number,
    timestamp: Date,
    speed: Number
  },
  last_seen: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'MISSING', 'SAFE', 'DANGER'],
    default: 'ACTIVE'
  },
  alerts_received: [{
    type: String,
    message: String,
    severity: String,
    timestamp: Date
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Tourist', touristSchema);