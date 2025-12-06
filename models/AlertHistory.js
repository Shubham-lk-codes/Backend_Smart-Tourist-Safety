// models/AlertHistory.js - Add this new model
const mongoose = require('mongoose');

const alertHistorySchema = new mongoose.Schema({
  alert_id: {
    type: String,
    required: true,
    unique: true
  },
  tourist_id: {
    type: String,
    required: true
  },
  tourist_name: {
    type: String,
    required: true
  },
  alert_type: {
    type: String,
    required: true,
    enum: ['GEOFENCE_VIOLATION', 'STATIONARY_TOO_LONG', 'SPEED_ANOMALY', 'MISSING_PERSON', 'POLICE_ALERT']
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  zone_info: {
    zone_id: String,
    zone_name: String
  },
  message: {
    type: String,
    required: true
  },
  police_contacted: {
    type: Boolean,
    default: false
  },
  police_contact_time: Date,
  resolved: {
    type: Boolean,
    default: false
  },
  metadata: {
    speed: Number,
    stationary_duration: Number
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AlertHistory', alertHistorySchema);