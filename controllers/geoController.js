const Geofence = require('../models/Geofence');

// Simple geofence check using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

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

      // Get all active geofences
      const geofences = await Geofence.find({ isActive: true });
      
      let result = {
        inGeofence: false,
        boundary: null,
        geofence: null
      };

      // Check each geofence
      for (const geofence of geofences) {
        if (geofence.type === 'circle') {
          const distance = calculateDistance(
            latitude, 
            longitude, 
            geofence.center.lat, 
            geofence.center.lng
          );
          
          if (distance <= geofence.radius) {
            result = {
              inGeofence: true,
              boundary: geofence.name,
              geofence: geofence
            };
            break;
          }
        }
        // Add polygon checking logic here if needed
      }

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
        error: 'Internal server error',
        details: error.message
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
        error: 'Internal server error',
        details: error.message
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
      
      res.status(201).json({
        message: 'Geofence added successfully',
        geofence: newGeofence
      });
    } catch (error) {
      console.error('Error adding geofence:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
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
      
      res.json({
        message: 'Geofence updated successfully',
        geofence: updatedGeofence
      });
    } catch (error) {
      console.error('Error updating geofence:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
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
      
      res.json({
        message: 'Geofence deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting geofence:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
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

      const geofences = await Geofence.find({ isActive: true });
      
      // Calculate distances and sort
      const geofencesWithDistance = geofences.map(geofence => {
        let distance = Infinity;
        
        if (geofence.type === 'circle') {
          distance = calculateDistance(
            latitude, 
            longitude, 
            geofence.center.lat, 
            geofence.center.lng
          );
          distance = Math.max(0, distance - geofence.radius); // Distance to boundary
        }
        
        return {
          ...geofence.toObject(),
          distance
        };
      }).sort((a, b) => a.distance - b.distance).slice(0, parseInt(limit));
      
      res.json({
        latitude,
        longitude,
        nearestGeofences: geofencesWithDistance
      });
    } catch (error) {
      console.error('Error finding nearest geofences:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }
};

module.exports = geoController;