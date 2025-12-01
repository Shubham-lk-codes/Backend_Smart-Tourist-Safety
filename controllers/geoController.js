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

  // Get all geofence boundaries - FIXED RESPONSE STRUCTURE
  getGeofences: async (req, res) => {
    try {
      console.log('📋 Fetching all geofences from database...');
      const geofences = await Geofence.find({ isActive: true });
      console.log(`✅ Found ${geofences.length} geofences`);
      
      // Return as array directly for frontend compatibility
      res.json(geofences);
    } catch (error) {
      console.error('❌ Error getting geofences:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  },

  // Add a new geofence - FIXED VALIDATION AND ERROR HANDLING
  addGeofence: async (req, res) => {
    console.log('🆕 Received request to add new geofence');
    
    try {
      const { name, type, center, radius, coordinates } = req.body;
      
      console.log('📨 Received geofence data:', { 
        name, 
        type, 
        center, 
        radius, 
        coordinatesCount: coordinates ? coordinates.length : 0 
      });
      
      // Enhanced validation
      if (!name || !name.trim()) {
        console.log('❌ Validation failed: Zone name is required');
        return res.status(400).json({
          error: 'Zone name is required'
        });
      }
      

      // Validate type
      if (!type || !['circle', 'polygon'].includes(type)) {
        console.log('❌ Validation failed: Invalid geofence type');
        return res.status(400).json({
          error: 'Invalid geofence type. Must be "circle" or "polygon"'
        });
      }

      // Circle validation
      if (type === 'circle') {
        if (!center || center.lat === undefined || center.lng === undefined) {
          console.log('❌ Validation failed: Center coordinates are required for circular zone');
          return res.status(400).json({
            error: 'Center coordinates are required for circular zone'
          });
        }
        
        const centerLat = parseFloat(center.lat);
        const centerLng = parseFloat(center.lng);
        
        if (isNaN(centerLat) || isNaN(centerLng)) {
          console.log('❌ Validation failed: Invalid center coordinates');
          return res.status(400).json({
            error: 'Invalid center coordinates'
          });
        }
        
        if (!radius || isNaN(radius) || parseFloat(radius) <= 0) {
          console.log('❌ Validation failed: Valid radius is required');
          return res.status(400).json({
            error: 'Valid radius is required (must be greater than 0)'
          });
        }
      }

      // Polygon validation
      if (type === 'polygon') {
        if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
          console.log('❌ Validation failed: At least 3 coordinates are required for polygon');
          return res.status(400).json({
            error: 'At least 3 coordinates are required for polygon geofence'
          });
        }

        // Validate each coordinate
        for (let i = 0; i < coordinates.length; i++) {
          const coord = coordinates[i];
          if (!coord || coord.lat === undefined || coord.lng === undefined) {
            console.log(`❌ Validation failed: Invalid coordinate at index ${i}`);
            return res.status(400).json({
              error: `Invalid coordinate at position ${i + 1}`
            });
          }
          
          const coordLat = parseFloat(coord.lat);
          const coordLng = parseFloat(coord.lng);
          
          if (isNaN(coordLat) || isNaN(coordLng)) {
            console.log(`❌ Validation failed: Invalid coordinate values at index ${i}`);
            return res.status(400).json({
              error: `Invalid coordinate values at position ${i + 1}`
            });
          }
        }
      }

      // Prepare geofence data
      const geofenceData = {
        name: name.trim(),
        type: type,
        isActive: true
      };

      // Add circle-specific data
      if (type === 'circle') {
        geofenceData.center = {
          lat: parseFloat(center.lat),
          lng: parseFloat(center.lng)
        };
        geofenceData.radius = parseFloat(radius);
        console.log('🔵 Circle data prepared:', geofenceData.center, 'radius:', geofenceData.radius);
      }

      // Add polygon-specific data
      if (type === 'polygon') {
        geofenceData.coordinates = coordinates.map(coord => ({
          lat: parseFloat(coord.lat),
          lng: parseFloat(coord.lng)
        }));
        console.log('🔷 Polygon data prepared with', geofenceData.coordinates.length, 'points');
      }

      console.log('💾 Attempting to save geofence to database...');
      
      const newGeofence = new Geofence(geofenceData);
      const savedGeofence = await newGeofence.save();

      console.log('✅ Geofence saved successfully with ID:', savedGeofence._id);
      
      res.status(201).json({
        message: 'Geofence added successfully',
        geofence: savedGeofence
      });
    } catch (error) {
      console.error('💥 ERROR adding geofence:', error);
      console.error('Error stack:', error.stack);
      
      // Handle MongoDB validation errors
      if (error.name === 'ValidationError') {
        console.log('❌ MongoDB Validation Error:', error.errors);
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        console.log('❌ Duplicate key error');
        return res.status(400).json({
          error: 'Geofence with this name already exists'
        });
      }
      
      // Handle connection errors
      if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
        console.log('❌ MongoDB connection error');
        return res.status(500).json({
          error: 'Database connection error',
          details: 'Cannot connect to database'
        });
      }
      
      console.log('❌ Unknown error type:', error.name);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // Update geofence
  updateGeofence: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate ID
      if (!id) {
        return res.status(400).json({
          error: 'Geofence ID is required'
        });
      }

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

      // Validate ID
      if (!id) {
        return res.status(400).json({
          error: 'Geofence ID is required'
        });
      }

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
        message: 'Geofence deleted successfully',
        deletedId: id
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
  },
   initializeSampleGeofences: async () => {
    try {
      const Geofence = require('../models/Geofence');
      const count = await Geofence.countDocuments();

      if (count === 0) {
        console.log('📝 Creating sample geofences...');

        const sampleGeofences = [
          {
            name: 'Main Tourist Area',
            type: 'circle',
            center: { lat: 28.6139, lng: 77.2090 },
            radius: 5000,
            isActive: true
          },
          {
            name: 'Safety Zone 1',
            type: 'circle',
            center: { lat: 21.1458, lng: 79.0881 },
            radius: 3000,
            isActive: true
          }
        ];

        await Geofence.insertMany(sampleGeofences);
        console.log('✅ Sample geofences created');
      }
    } catch (error) {
      console.error('❌ Error creating sample geofences:', error);
    }
  }
};



module.exports = geoController;