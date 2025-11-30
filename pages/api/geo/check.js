// pages/api/geo/check.js
const fenceConfig = require('../../../geofence/fenceConfig');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
                                                                                    
    res.status(200).json({
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
      error: 'Internal server error: ' + error.message
    });
  }
}