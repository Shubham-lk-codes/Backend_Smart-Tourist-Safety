const mongoose = require('mongoose');

const safeZoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  distance: { // in kilometers
    type: String,
    default: "1.5 km"
  },
  type: {
    type: String,
    enum: ['police_station', 'hospital', 'embassy', 'tourist_center', 'safe_haven'],
    default: 'safe_haven'
  },
  phone: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SafeZone', safeZoneSchema);