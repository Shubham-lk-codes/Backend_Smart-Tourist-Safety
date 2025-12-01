const { getEmergencyAlertsMap, broadcastToPolice } = require('./websocketController');

const getEmergencies = (req, res) => {
  const emergencies = Array.from(getEmergencyAlertsMap().values());
  res.json({
    activeEmergencies: emergencies.filter(e => e.status === 'active').length,
    totalEmergencies: emergencies.length,
    emergencies: emergencies
  });
};

const getEmergencyById = (req, res) => {
  const alert = getEmergencyAlertsMap().get(req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Emergency alert not found' });
  }
  res.json(alert);
};

// NEW: Handle panic alert from HTTP POST
const createPanicAlert = (req, res) => {
  try {
    const { userId, location, emergencyType, message } = req.body;
    
    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const alertId = `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const emergencyAlert = {
      id: alertId,
      clientId: userId || `user_${Date.now()}`,
      type: 'panic_alert',
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || 10
      },
      timestamp: new Date().toISOString(),
      status: 'active',
      acknowledged: false,
      data: {
        emergencyType: emergencyType || 'general',
        message: message || 'Need immediate help!',
        source: 'http_api'
      }
    };

    // Store in memory
    const emergencyAlertsMap = getEmergencyAlertsMap();
    emergencyAlertsMap.set(alertId, emergencyAlert);
    
    // Broadcast to all police users via WebSocket
    broadcastToPolice({
      type: 'emergency_alert',
      alert: emergencyAlert,
      timestamp: new Date().toISOString()
    });

    console.log(`🚨 HTTP PANIC ALERT received:`, {
      alertId: alertId,
      userId: emergencyAlert.clientId,
      location: emergencyAlert.location
    });

    res.status(201).json({
      success: true,
      alertId: alertId,
      message: 'Emergency alert created and sent to authorities',
      timestamp: emergencyAlert.timestamp
    });

  } catch (error) {
    console.error('Error creating panic alert:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

module.exports = {
  getEmergencies,
  getEmergencyById,
  createPanicAlert  // Export the new function
};