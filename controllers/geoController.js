// controllers/geoController.js
const fenceConfig = require('../geofence/fenceConfig');

const geoController = {
  // Check if location is within geofence
  checkLocation: (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({
          error: 'Latitude and longitude are required'
        });
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          error: 'Invalid latitude or longitude'
        });
      }

      const result = fenceConfig.isPointInGeofence(latitude, longitude);
      
      res.json({
        latitude,
        longitude,
        inGeofence: result.inGeofence,
        boundary: result.boundary,
        message: result.inGeofence 
          ? `You are within ${result.boundary}`
          : 'You are outside safe zones'
      });
    } catch (error) {
      console.error('Error checking location:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  // Get all geofence boundaries
  getGeofences: (req, res) => {
    try {
      res.json({
        boundaries: fenceConfig.boundaries
      });
    } catch (error) {
      console.error('Error getting geofences:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  // Add a new geofence (for admin purposes)
  addGeofence: (req, res) => {
    try {
      const { name, center, radius } = req.body;
      
      if (!name || !center || !radius) {
        return res.status(400).json({
          error: 'Name, center, and radius are required'
        });
      }

      const newGeofence = {
        name,
        center: {
          lat: parseFloat(center.lat),
          lng: parseFloat(center.lng)
        },
        radius: parseFloat(radius)
      };

      fenceConfig.boundaries.push(newGeofence);
      
      res.json({
        message: 'Geofence added successfully',
        geofence: newGeofence
      });
    } catch (error) {
      console.error('Error adding geofence:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
};

module.exports = geoController;