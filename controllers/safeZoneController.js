const SafeZone = require('../models/SafeZone');

// Get all safe zones
const getSafeZones = async (req, res) => {
  try {
    console.log('📋 Fetching safe zones...');
    const safeZones = await SafeZone.find({ isActive: true });
    
    console.log(`✅ Found ${safeZones.length} safe zones`);
    res.json(safeZones);
  } catch (error) {
    console.error('❌ Error fetching safe zones:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Get safe zones by type
const getSafeZonesByType = async (req, res) => {
  try {
    const { type } = req.params;
    const safeZones = await SafeZone.find({ 
      type: type,
      isActive: true 
    });
    
    res.json(safeZones);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Get nearest safe zones (simplified)
const getNearestSafeZones = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query; // radius in km
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    const safeZones = await SafeZone.find({ isActive: true });
    
    // Add dummy distance calculation (you can implement proper geospatial query)
    const safeZonesWithDistance = safeZones.map(zone => ({
      ...zone.toObject(),
      distance: `${(Math.random() * 5).toFixed(1)} km` // Mock distance
    }));

    res.json(safeZonesWithDistance);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Initialize sample safe zones
const initializeSampleSafeZones = async () => {
  try {
    const count = await SafeZone.countDocuments();
    
    if (count === 0) {
      console.log('📝 Creating sample safe zones...');
      
      const sampleSafeZones = [
        {
          name: "Main Police Station",
          address: "123 Safety Street, Tourist District",
          description: "24/7 police assistance available",
          location: {
            latitude: 28.6139,
            longitude: 77.2090
          },
          distance: "0.5 km",
          type: "police_station",
          phone: "100"
        },
        {
          name: "City General Hospital",
          address: "456 Health Avenue, Medical Zone",
          description: "Emergency medical services",
          location: {
            latitude: 28.6200,
            longitude: 77.2100
          },
          distance: "1.2 km",
          type: "hospital",
          phone: "102"
        },
        {
          name: "Tourist Information Center",
          address: "789 Tourist Plaza, City Center",
          description: "Tourist assistance and guidance",
          location: {
            latitude: 28.6100,
            longitude: 77.2050
          },
          distance: "0.8 km",
          type: "tourist_center",
          phone: "1363"
        },
        {
          name: "Safe Haven Cafe",
          address: "321 Peace Road, Safe Zone",
          description: "24/7 open cafe with security",
          location: {
            latitude: 28.6150,
            longitude: 77.2120
          },
          distance: "1.5 km",
          type: "safe_haven"
        },
        {
          name: "US Embassy",
          address: "900 Diplomatic Enclave",
          description: "Embassy assistance for US citizens",
          location: {
            latitude: 28.6000,
            longitude: 77.2000
          },
          distance: "2.3 km",
          type: "embassy",
          phone: "011-2419-8000"
        }
      ];

      await SafeZone.insertMany(sampleSafeZones);
      console.log('✅ Sample safe zones created');
    } else {
      console.log(`✅ ${count} safe zones already exist`);
    }
  } catch (error) {
    console.error('❌ Error creating sample safe zones:', error);
  }
};

module.exports = {
  getSafeZones,
  getSafeZonesByType,
  getNearestSafeZones,
  initializeSampleSafeZones
};