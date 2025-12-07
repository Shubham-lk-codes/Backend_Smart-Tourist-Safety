// controllers/emergencyController.js
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

// Acknowledge emergency
const acknowledgeEmergency = async (req, res) => {
  try {
    const { id } = req.params;
    const { acknowledgedBy } = req.body;
    
    const emergencyAlertsMap = getEmergencyAlertsMap();
    const alert = emergencyAlertsMap.get(id);
    
    if (!alert) {
      return res.status(404).json({ error: 'Emergency alert not found' });
    }
    
    alert.status = 'acknowledged';
    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy || 'police';
    alert.acknowledgedAt = new Date().toISOString();
    
    emergencyAlertsMap.set(id, alert);
    
    // Broadcast update
    broadcastToPolice({
      type: 'emergency_status_update',
      alert: alert,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Emergency acknowledged',
      alert: alert
    });
    
  } catch (error) {
    console.error('Error acknowledging emergency:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

// Resolve emergency
const resolveEmergency = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedBy } = req.body;
    
    const emergencyAlertsMap = getEmergencyAlertsMap();
    const alert = emergencyAlertsMap.get(id);
    
    if (!alert) {
      return res.status(404).json({ error: 'Emergency alert not found' });
    }
    
    alert.status = 'resolved';
    alert.resolved = true;
    alert.resolvedBy = resolvedBy || 'police';
    alert.resolvedAt = new Date().toISOString();
    
    emergencyAlertsMap.set(id, alert);
    
    // Broadcast update
    broadcastToPolice({
      type: 'emergency_status_update',
      alert: alert,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Emergency resolved',
      alert: alert
    });
    
  } catch (error) {
    console.error('Error resolving emergency:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

// Handle panic alert from HTTP POST
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

// NEW: Handle ML alerts
const handleMLAlert = async (req, res) => {
    try {
        console.log('📨 Received ML Alert:', req.body);
        
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

        console.log(`🤖 ML ALERT created: ${tourist_id} - ${message}`);

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

module.exports = {
    getEmergencies,
    getEmergencyById,
    acknowledgeEmergency,
    resolveEmergency,
    createPanicAlert,
    handleMLAlert  // Make sure this is defined as a function above
};