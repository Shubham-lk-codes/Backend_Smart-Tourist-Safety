const EmergencyContact = require('../models/EmergencyContact');

// Get all emergency contacts
const getEmergencyContacts = async (req, res) => {
  try {
    console.log('📋 Fetching emergency contacts...');
    const contacts = await EmergencyContact.find({ isActive: true })
      .sort({ priority: 1, name: 1 });
    
    console.log(`✅ Found ${contacts.length} emergency contacts`);
    res.json(contacts);
  } catch (error) {
    console.error('❌ Error fetching emergency contacts:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Get emergency contacts by type
const getEmergencyContactsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const contacts = await EmergencyContact.find({ 
      type: type,
      isActive: true 
    }).sort({ priority: 1 });
    
    res.json(contacts);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Initialize sample emergency contacts
const initializeSampleEmergencyContacts = async () => {
  try {
    const count = await EmergencyContact.countDocuments();
    
    if (count === 0) {
      console.log('📝 Creating sample emergency contacts...');
      
      const sampleContacts = [
        {
          name: "Police Emergency",
          phone: "100",
          type: "police",
          countryCode: "+91",
          description: "Police emergency hotline",
          priority: 1
        },
        {
          name: "Ambulance Emergency",
          phone: "102",
          type: "ambulance",
          countryCode: "+91",
          description: "Medical emergency ambulance",
          priority: 1
        },
        {
          name: "Fire Department",
          phone: "101",
          type: "fire",
          countryCode: "+91",
          description: "Fire emergency services",
          priority: 1
        },
        {
          name: "Tourist Helpline",
          phone: "1363",
          type: "tourist_helpline",
          countryCode: "+91",
          description: "24/7 tourist assistance",
          priority: 2
        },
        {
          name: "Women's Helpline",
          phone: "1091",
          type: "local_authority",
          countryCode: "+91",
          description: "Women's safety and assistance",
          priority: 2
        },
        {
          name: "Local Police Control Room",
          phone: "011-2301-3456",
          type: "police",
          countryCode: "+91",
          description: "Local police control room",
          priority: 2
        },
        {
          name: "Emergency Rescue",
          phone: "108",
          type: "ambulance",
          countryCode: "+91",
          description: "Disaster management helpline",
          priority: 3
        },
        {
          name: "US Embassy Helpline",
          phone: "011-2419-8000",
          type: "embassy",
          countryCode: "+91",
          description: "Emergency assistance for US citizens",
          priority: 3
        }
      ];

      await EmergencyContact.insertMany(sampleContacts);
      console.log('✅ Sample emergency contacts created');
    } else {
      console.log(`✅ ${count} emergency contacts already exist`);
    }
  } catch (error) {
    console.error('❌ Error creating sample emergency contacts:', error);
  }
};
// ===== NEW ML ALERT HANDLER =====
const handleMLAlert = async (req, res) => {
    try {
        const { tourist_id, message, location, severity, type } = req.body;

        if (!tourist_id || !message) {
            return res.status(400).json({ 
                error: 'Tourist ID and message are required' 
            });
        }

        const alertId = `ml_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const emergencyAlert = {
            id: alertId,
            clientId: tourist_id,
            type: 'ml_anomaly',
            location: location || null,
            timestamp: new Date().toISOString(),
            status: 'active',
            acknowledged: false,
            data: {
                message: message,
                severity: severity || 'HIGH',
                anomaly_type: type || 'ANOMALY_DETECTED',
                source: 'ML_MODEL'
            }
        };

        // Store in memory
        const emergencyAlertsMap = getEmergencyAlertsMap();
        emergencyAlertsMap.set(alertId, emergencyAlert);
        
        // Broadcast to police
        broadcastToPolice({
            type: 'emergency_alert',
            alert: emergencyAlert,
            timestamp: new Date().toISOString()
        });

        console.log(`🤖 ML ALERT: ${tourist_id} - ${message}`);

        res.status(201).json({
            success: true,
            alertId: alertId,
            message: 'ML alert processed and emergency services notified',
            timestamp: emergencyAlert.timestamp
        });

    } catch (error) {
        console.error('Error handling ML alert:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
};

// ===== BATCH PROCESS TOURIST LOCATIONS =====
const processTouristLocations = async (req, res) => {
    try {
        const { locations } = req.body;
        
        if (!Array.isArray(locations)) {
            return res.status(400).json({ 
                error: 'Locations must be an array' 
            });
        }

        const mlController = require('./mlController');
        const results = [];

        for (const location of locations) {
            const { tourist_id, latitude, longitude, timestamp } = location;
            
            if (!tourist_id || !latitude || !longitude) {
                continue;
            }

            const mlResult = await mlController.processLocation(tourist_id, {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                timestamp: timestamp || Date.now() / 1000
            });

            results.push(mlResult);

            // If anomaly detected, trigger emergency
            if (mlResult.is_anomalous && mlResult.alerts && mlResult.alerts.length > 0) {
                await handleMLAlert({
                    body: {
                        tourist_id: tourist_id,
                        message: mlResult.alerts.join('; '),
                        location: { latitude, longitude },
                        severity: 'HIGH',
                        type: 'ANOMALY_DETECTED'
                    }
                }, {
                    status: () => ({ json: () => {} }),
                    json: () => {}
                });
            }
        }

        res.json({
            success: true,
            processed: results.length,
            results: results
        });

    } catch (error) {
        console.error('Error processing tourist locations:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
};

// ===== GET ML SYSTEM STATUS =====
const getMLSystemStatus = async (req, res) => {
    try {
        const mlController = require('./mlController');
        const status = await mlController.getMLStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to get ML status',
            details: error.message 
        });
    }
};

module.exports = {
  getEmergencyContacts,
  getEmergencyContactsByType,
  initializeSampleEmergencyContacts
};