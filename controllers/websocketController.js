const WebSocket = require('ws');

// WebSocket connections storage
const connectedClients = new Map();
const emergencyAlerts = new Map();

function initializeWebSocket(server) {
  const wss = new WebSocket.Server({ 
    server,
    perMessageDeflate: false
  });

  wss.on('connection', (ws, req) => {
    const clientId = generateClientId();
    console.log(`🔗 New WebSocket connection: ${clientId}`);
    
    connectedClients.set(ws, {
      id: clientId,
      connectedAt: new Date(),
      location: null,
      userType: 'tourist'
    });

    // Send welcome message
    sendToClient(ws, {
      type: 'connection_established',
      clientId: clientId,
      message: 'WebSocket connected successfully',
      timestamp: new Date().toISOString()
    });

    ws.on('message', (message) => handleWebSocketMessage(ws, message));
    ws.on('close', (code, reason) => handleWebSocketClose(ws, code, reason));
    ws.on('error', (error) => handleWebSocketError(ws, error));

    // Notify about new user connection
    broadcastToAll({
      type: 'user_connected',
      clientId: clientId,
      userCount: connectedClients.size,
      timestamp: new Date().toISOString()
    }, ws);
  });

  // Start health checks
  startHealthChecks();
  startAlertCleanup();

  return wss;
}

function handleWebSocketMessage(ws, message) {
  const clientData = connectedClients.get(ws);
  if (!clientData) return;

  try {
    const data = JSON.parse(message);
    console.log(`📨 Received from ${clientData.id}:`, data.type);
    
    switch (data.type) {
      case 'location_update':
        handleLocationUpdate(ws, data.data);
        break;
      
      case 'ping':
        sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      
      case 'panic_alert':
        handlePanicAlert(ws, data);
        break;
        
      case 'identify_user':
        handleUserIdentification(ws, data);
        break;
        
      case 'emergency_acknowledged':
        handleEmergencyAcknowledgment(ws, data);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  } catch (error) {
    console.error('❌ Error processing WebSocket message:', error);
    sendToClient(ws, {
      type: 'error',
      message: 'Invalid message format'
    });
  }
}

function handleWebSocketClose(ws, code, reason) {
  const clientData = connectedClients.get(ws);
  if (!clientData) return;

  console.log(`🔴 WebSocket disconnected: ${clientData.id} (Code: ${code})`);
  
  removeClientEmergencyAlerts(clientData.id);
  connectedClients.delete(ws);
  
  broadcastToAll({
    type: 'user_disconnected',
    clientId: clientData.id,
    timestamp: new Date().toISOString()
  }, ws);
}

function handleWebSocketError(ws, error) {
  const clientData = connectedClients.get(ws);
  const clientId = clientData ? clientData.id : 'unknown';
  
  console.error(`💥 WebSocket error for ${clientId}:`, error);
  removeClientEmergencyAlerts(clientId);
  connectedClients.delete(ws);
}

// WebSocket message handlers
function handleLocationUpdate(ws, locationData) {
  const clientData = connectedClients.get(ws);
  if (!clientData) return;

  clientData.location = {
    ...locationData,
    lastUpdate: new Date().toISOString()
  };
  
  broadcastToAll({
    type: 'location_update',
    clientId: clientData.id,
    data: clientData.location,
    timestamp: new Date().toISOString()
  }, ws);
  
  console.log(`📍 Location update from ${clientData.id}:`, {
    lat: locationData.lat?.toFixed(6),
    lng: locationData.lng?.toFixed(6)
  });
}

function handlePanicAlert(ws, panicData) {
  const clientData = connectedClients.get(ws);
  if (!clientData) return;

  const alertId = `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const emergencyAlert = {
    id: alertId,
    clientId: clientData.id,
    type: 'panic_alert',
    location: panicData.location || clientData.location,
    timestamp: new Date().toISOString(),
    status: 'active',
    acknowledged: false,
    data: panicData.data || {}
  };

  emergencyAlerts.set(alertId, emergencyAlert);
  
  console.log(`🚨 PANIC ALERT from ${clientData.id}:`, {
    alertId: alertId,
    location: emergencyAlert.location,
    timestamp: emergencyAlert.timestamp
  });

  broadcastToAll(emergencyAlert);

  sendToClient(ws, {
    type: 'panic_acknowledged',
    alertId: alertId,
    message: 'Emergency services have been notified. Help is on the way!',
    timestamp: new Date().toISOString()
  });

  logEmergencyAlert(emergencyAlert);
}

function handleUserIdentification(ws, data) {
  const clientData = connectedClients.get(ws);
  if (clientData && data.userType) {
    clientData.userType = data.userType;
    console.log(`👤 User ${clientData.id} identified as: ${data.userType}`);
    
    if (data.userType === 'police') {
      sendActiveEmergenciesToPolice(ws);
    }
  }
}

function sendActiveEmergenciesToPolice(ws) {
  emergencyAlerts.forEach((alert) => {
    if (alert.status === 'active') {
      sendToClient(ws, alert);
    }
  });
  console.log(`📋 Sent ${emergencyAlerts.size} active emergencies to police`);
}

function handleEmergencyAcknowledgment(ws, data) {
  const clientData = connectedClients.get(ws);
  const alert = emergencyAlerts.get(data.alertId);
  
  if (alert && clientData && clientData.userType === 'police') {
    alert.status = 'acknowledged';
    alert.acknowledged = true;
    alert.acknowledgedBy = clientData.id;
    alert.acknowledgedAt = new Date().toISOString();
    
    console.log(`✅ Emergency ${data.alertId} acknowledged by police: ${clientData.id}`);
    
    broadcastToUser(alert.clientId, {
      type: 'emergency_acknowledged_by_authority',
      alertId: alert.id,
      acknowledgedBy: 'Police',
      timestamp: new Date().toISOString(),
      message: 'Police have acknowledged your emergency and are on the way!'
    });
    
    broadcastToPolice({
      type: 'emergency_status_update',
      alert: alert,
      timestamp: new Date().toISOString()
    });
  }
}

// Utility functions
function broadcastToUser(clientId, message) {
  connectedClients.forEach((clientData, ws) => {
    if (clientData.id === clientId && ws.readyState === WebSocket.OPEN) {
      sendToClient(ws, message);
    }
  });
}

function broadcastToPolice(message) {
  connectedClients.forEach((clientData, ws) => {
    if (clientData.userType === 'police' && ws.readyState === WebSocket.OPEN) {
      sendToClient(ws, message);
    }
  });
}

function broadcastToAll(message, excludeWs = null) {
  let deliveredCount = 0;

  connectedClients.forEach((clientData, ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      try {
        sendToClient(ws, message);
        deliveredCount++;
      } catch (error) {
        console.error('Error broadcasting to client:', error);
      }
    }
  });

  return deliveredCount;
}

function sendToClient(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function removeClientEmergencyAlerts(clientId) {
  emergencyAlerts.forEach((alert, alertId) => {
    if (alert.clientId === clientId) {
      emergencyAlerts.delete(alertId);
    }
  });
}

function logEmergencyAlert(alert) {
  console.log(`📊 LOGGED EMERGENCY: ${alert.id} from ${alert.clientId}`);
}

function generateClientId() {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function startHealthChecks() {
  setInterval(() => {
    const healthMessage = {
      type: 'health_check',
      userCount: connectedClients.size,
      activeEmergencies: emergencyAlerts.size,
      timestamp: new Date().toISOString()
    };

    broadcastToAll(healthMessage);
    
    // Clean up dead connections
    connectedClients.forEach((clientData, ws) => {
      if (ws.readyState !== WebSocket.OPEN) {
        removeClientEmergencyAlerts(clientData.id);
        connectedClients.delete(ws);
      }
    });
  }, 30000);
}

function startAlertCleanup() {
  setInterval(() => {
    const now = new Date();
    let cleanedCount = 0;
    
    emergencyAlerts.forEach((alert, alertId) => {
      const alertTime = new Date(alert.timestamp);
      const hoursDiff = (now - alertTime) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        emergencyAlerts.delete(alertId);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old emergency alerts`);
    }
  }, 3600000);
}

// Export for external use
module.exports = {
  initializeWebSocket,
  broadcastToAll,
  broadcastToPolice,
  broadcastToUser,
  getConnectedClients: () => connectedClients.size,
  getEmergencyAlerts: () => emergencyAlerts.size,
  getConnectedClientsMap: () => connectedClients,
  getEmergencyAlertsMap: () => emergencyAlerts
};