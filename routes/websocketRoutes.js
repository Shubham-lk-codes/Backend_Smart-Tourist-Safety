const express = require('express');
const router = express.Router();
const { getConnectedClients, getEmergencyAlerts, getConnectedClientsMap } = require('../controllers/websocketController');

router.get('/status', (req, res) => {
  const clients = Array.from(getConnectedClientsMap().entries()).map(([ws, data]) => ({
    id: data.id,
    connectedAt: data.connectedAt,
    userType: data.userType,
    hasLocation: !!data.location,
    lastUpdate: data.location?.lastUpdate
  }));

  res.json({
    websocketEnabled: true,
    activeConnections: getConnectedClients(),
    activeEmergencies: getEmergencyAlerts(),
    clients: clients
  });
});

router.get('/info', (req, res) => {
  res.json({
    websocketUrl: 'ws://localhost:3000',
    messageTypes: [
      'location_update',
      'user_connected', 
      'user_disconnected',
      'health_check',
      'connection_established',
      'panic_alert',
      'panic_acknowledged',
      'identify_user',
      'emergency_acknowledged',
      'emergency_status_update'
    ],
    examplePanicAlert: {
      type: 'panic_alert',
      location: {
        latitude: 28.6139,
        longitude: 77.2090,
        accuracy: 10
      },
      data: {
        emergencyType: 'medical',
        message: 'Need immediate help!'
      }
    }
  });
});

module.exports = router;