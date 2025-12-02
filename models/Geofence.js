const mongoose = require('mongoose');

const coordinateSchema = new mongoose.Schema({
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  }
});

const geofenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Zone name is required'],
    trim: true,
    unique: true
  },
  type: {
    type: String,
    required: [true, 'Zone type is required'],
    enum: {
      values: ['circle', 'polygon'],
      message: 'Zone type must be either "circle" or "polygon"'
    },
    default: 'circle'
  },
  center: {
    lat: {
      type: Number,
      required: function() { return this.type === 'circle'; }
    },
    lng: {
      type: Number,
      required: function() { return this.type === 'circle'; }
    }
  },
  radius: {
    type: Number, // in meters
    required: function() { return this.type === 'circle'; }
  },
  coordinates: {
    type: [coordinateSchema], // For polygon type
    required: function() { return this.type === 'polygon'; }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving - SIMPLIFIED VERSION
geofenceSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Geofence', geofenceSchema);