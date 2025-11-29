const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['circle', 'polygon'],
    default: 'circle'
  },
  // For circle type
  center: {
    lat: { type: Number, required: false },
    lng: { type: Number, required: false }
  },
  radius: { type: Number, required: false }, // in meters
  
  // For polygon type
  coordinates: [{
    lat: Number,
    lng: Number
  }],
  
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
geofenceSchema.index({ "center": "2dsphere" });

module.exports = mongoose.model('Geofence', geofenceSchema);