const fenceConfig = require('../geofence/fenceConfig');
const Geofence = require('../models/Geofence');

const geoController = {
  // Check if location is within geofence
  checkLocation: async (req, res) => {
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

      const result = await fenceConfig.isPointInGeofence(latitude, longitude);
                                                                                                                                                        
      res.json({
        latitude,
        longitude,
        inGeofence: result.inGeofence,                                                                  
        boundary: result.boundary,
        geofence: result.geofence,
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
  getGeofences: async (req, res) => {
    try {
      const geofences = await Geofence.find({ isActive: true });
      res.json({
        boundaries: geofences
      });
    } catch (error) {
      console.error('Error getting geofences:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  // Add a new geofence
  addGeofence: async (req, res) => {
    try {
      const { name, type, center, radius, coordinates } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({
          error: 'Name and type are required'
        });
      }

      if (type === 'circle' && (!center || !radius)) {
        return res.status(400).json({
          error: 'Center and radius are required for circle geofence'
        });
      }

      if (type === 'polygon' && (!coordinates || coordinates.length < 3)) {
        return res.status(400).json({
          error: 'At least 3 coordinates are required for polygon geofence'
        });
      }

      const newGeofence = new Geofence({
        name,
        type,
        center: center ? {
          lat: parseFloat(center.lat),
          lng: parseFloat(center.lng)
        } : undefined,
        radius: radius ? parseFloat(radius) : undefined,
        coordinates: coordinates ? coordinates.map(coord => ({
          lat: parseFloat(coord.lat),
          lng: parseFloat(coord.lng)
        })) : undefined
      });

      await newGeofence.save();
      fenceConfig.clearCache(); // Clear cache after update
      
      res.status(201).json({
        message: 'Geofence added successfully',
        geofence: newGeofence
      });
    } catch (error) {
      console.error('Error adding geofence:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  // Update geofence
  updateGeofence: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedGeofence = await Geofence.findByIdAndUpdate(
        id, 
        updateData, 
        { new: true, runValidators: true }
      );

      if (!updatedGeofence) {
        return res.status(404).json({
          error: 'Geofence not found'
        });
      }

      fenceConfig.clearCache();
      
      res.json({
        message: 'Geofence updated successfully',
        geofence: updatedGeofence
      });
    } catch (error) {
      console.error('Error updating geofence:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  // Delete geofence (soft delete)
  deleteGeofence: async (req, res) => {
    try {
      const { id } = req.params;

      const deletedGeofence = await Geofence.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!deletedGeofence) {
        return res.status(404).json({
          error: 'Geofence not found'
        });
      }

      fenceConfig.clearCache();
      
      res.json({
        message: 'Geofence deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting geofence:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  // Find nearest geofences
  findNearest: async (req, res) => {
    try {
      const { lat, lng, limit = 5 } = req.query;
      
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

      const nearest = await fenceConfig.findNearestGeofences(latitude, longitude, parseInt(limit));
      
      res.json({
        latitude,
        longitude,
        nearestGeofences: nearest
      });
    } catch (error) {
      console.error('Error finding nearest geofences:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
};


module.exports = geoController;