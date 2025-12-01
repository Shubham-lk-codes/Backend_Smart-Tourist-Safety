// const mongoose = require('mongoose');

// const geofenceSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true
//   },
//   type: {
//     type: String,
//     enum: ['circle', 'polygon'],
//     default: 'circle'
//   },
//   // For circle type
//   center: {
//     lat: { type: Number, required: false },
//     lng: { type: Number, required: false }
//   },
//   radius: { type: Number, required: false }, // in meters
  
//   // For polygon type
//   coordinates: [{
//     lat: Number,
//     lng: Number
//   }],
  
//   isActive: {
//     type: Boolean,
//     default: true
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// // Index for geospatial queries
// geofenceSchema.index({ "center": "2dsphere" });

// module.exports = mongoose.model('Geofence', geofenceSchema);

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
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['circle', 'polygon'],
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
  coordinates: [coordinateSchema], // For polygon type
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

// Update the updatedAt field before saving
geofenceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Geofence', geofenceSchema);