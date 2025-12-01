// const express = require('express');
// const http = require('http');
// const WebSocket = require('ws');
// const helmet = require('helmet');
// const cors = require('cors');
// const morgan = require('morgan');
// const mongoose = require('mongoose');
// const geoRoutes = require("./routes/geoRoutes");
// const userRoutes = require("./routes/userRoutes");
// require('dotenv').config();

// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocket.Server({ 
//   server,
//   perMessageDeflate: false
// });

// const PORT = process.env.PORT || 3000;

// // MongoDB Connection
// const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-tourist-safety';

// mongoose.connect(MONGODB_URI)
//   .then(() => {
//     console.log('Connected to MongoDB');
//   })
//   .catch((error) => {
//     console.error('MongoDB connection error:', error);
//   });

// // WebSocket connections storage
// const connectedClients = new Map();
// // Emergency alerts storage
// const emergencyAlerts = new Map();

// wss.on('connection', (ws, req) => {
//   const clientId = generateClientId();
//   console.log(`🔗 New WebSocket connection: ${clientId}`);
  
//   connectedClients.set(ws, {
//     id: clientId,
//     connectedAt: new Date(),
//     location: null,
//     userType: 'tourist' // default, can be changed later
//   });

//   // Send welcome message
//   ws.send(JSON.stringify({
//     type: 'connection_established',
//     clientId: clientId,
//     message: 'WebSocket connected successfully',
//     timestamp: new Date().toISOString()
//   }));

//   ws.on('message', (message) => {
//     try {
//       const data = JSON.parse(message);
//       console.log(`📨 Received from ${clientId}:`, data.type);
      
//       switch (data.type) {
//         case 'location_update':
//           handleLocationUpdate(ws, data.data);
//           break;
        
//         case 'ping':
//           ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
//           break;
        
//         // NEW: Handle panic alerts
//         case 'panic_alert':
//           handlePanicAlert(ws, data);
//           break;
          
//         // NEW: Handle user type identification (police/tourist)
//         case 'identify_user':
//           handleUserIdentification(ws, data);
//           break;
          
//         // NEW: Handle emergency acknowledgment from police
//         case 'emergency_acknowledged':
//           handleEmergencyAcknowledgment(ws, data);
//           break;
          
//         default:
//           console.log('Unknown message type:', data.type);
//       }
//     } catch (error) {
//       console.error('❌ Error processing WebSocket message:', error);
//       ws.send(JSON.stringify({
//         type: 'error',
//         message: 'Invalid message format'
//       }));
//     }
//   });

//   ws.on('close', (code, reason) => {
//     console.log(`🔴 WebSocket disconnected: ${clientId} (Code: ${code})`);
    
//     // Remove any emergency alerts from this client
//     removeClientEmergencyAlerts(clientId);
//     connectedClients.delete(ws);
    
//     // Notify other clients about user disconnect
//     broadcastToAll({
//       type: 'user_disconnected',
//       clientId: clientId,
//       timestamp: new Date().toISOString()
//     }, ws);
//   });

//   ws.on('error', (error) => {
//     console.error(`💥 WebSocket error for ${clientId}:`, error);
//     removeClientEmergencyAlerts(clientId);
//     connectedClients.delete(ws);
//   });

//   // Notify about new user connection
//   broadcastToAll({
//     type: 'user_connected',
//     clientId: clientId,
//     userCount: connectedClients.size,
//     timestamp: new Date().toISOString()
//   }, ws);
// });

// // NEW: Panic Alert Handler
// function handlePanicAlert(ws, panicData) {
//   const clientData = connectedClients.get(ws);
//   if (!clientData) return;

//   const alertId = `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
//   const emergencyAlert = {
//     id: alertId,
//     clientId: clientData.id,
//     type: 'panic_alert',
//     location: panicData.location || clientData.location,
//     timestamp: new Date().toISOString(),
//     status: 'active',
//     acknowledged: false,
//     data: panicData.data || {}
//   };

//   // Store the alert
//   emergencyAlerts.set(alertId, emergencyAlert);
  
//   console.log(`🚨 PANIC ALERT from ${clientData.id}:`, {
//     alertId: alertId,
//     location: emergencyAlert.location,
//     timestamp: emergencyAlert.timestamp
//   });

//   // Broadcast to ALL connected clients (including police)
//   broadcastToAll(emergencyAlert);

//   // Send acknowledgment back to tourist
//   ws.send(JSON.stringify({
//     type: 'panic_acknowledged',
//     alertId: alertId,
//     message: 'Emergency services have been notified. Help is on the way!',
//     timestamp: new Date().toISOString()
//   }));

//   // Log to database or external service
//   logEmergencyAlert(emergencyAlert);
// }

// // NEW: Handle user identification (police/tourist)
// function handleUserIdentification(ws, data) {
//   const clientData = connectedClients.get(ws);
//   if (clientData && data.userType) {
//     clientData.userType = data.userType;
//     console.log(`👤 User ${clientData.id} identified as: ${data.userType}`);
    
//     // If police connects, send all active emergencies
//     if (data.userType === 'police') {
//       sendActiveEmergenciesToPolice(ws);
//     }
//   }
// }

// // NEW: Send all active emergencies to police when they connect
// function sendActiveEmergenciesToPolice(ws) {
//   emergencyAlerts.forEach((alert) => {
//     if (alert.status === 'active') {
//       ws.send(JSON.stringify(alert));
//     }
//   });
//   console.log(`📋 Sent ${emergencyAlerts.size} active emergencies to police`);
// }

// // NEW: Handle emergency acknowledgment from police
// function handleEmergencyAcknowledgment(ws, data) {
//   const clientData = connectedClients.get(ws);
//   const alert = emergencyAlerts.get(data.alertId);
  
//   if (alert && clientData && clientData.userType === 'police') {
//     alert.status = 'acknowledged';
//     alert.acknowledged = true;
//     alert.acknowledgedBy = clientData.id;
//     alert.acknowledgedAt = new Date().toISOString();
    
//     console.log(`✅ Emergency ${data.alertId} acknowledged by police: ${clientData.id}`);
    
//     // Notify the original tourist who sent the alert
//     broadcastToUser(alert.clientId, {
//       type: 'emergency_acknowledged_by_authority',
//       alertId: alert.id,
//       acknowledgedBy: 'Police',
//       timestamp: new Date().toISOString(),
//       message: 'Police have acknowledged your emergency and are on the way!'
//     });
    
//     // Broadcast update to all police
//     broadcastToPolice({
//       type: 'emergency_status_update',
//       alert: alert,
//       timestamp: new Date().toISOString()
//     });
//   }
// }

// // NEW: Broadcast to specific user
// function broadcastToUser(clientId, message) {
//   connectedClients.forEach((clientData, ws) => {
//     if (clientData.id === clientId && ws.readyState === WebSocket.OPEN) {
//       ws.send(JSON.stringify(message));
//     }
//   });
// }

// // NEW: Broadcast only to police users
// function broadcastToPolice(message) {
//   connectedClients.forEach((clientData, ws) => {
//     if (clientData.userType === 'police' && ws.readyState === WebSocket.OPEN) {
//       ws.send(JSON.stringify(message));
//     }
//   });
// }

// // NEW: Remove emergency alerts when client disconnects
// function removeClientEmergencyAlerts(clientId) {
//   emergencyAlerts.forEach((alert, alertId) => {
//     if (alert.clientId === clientId) {
//       emergencyAlerts.delete(alertId);
//     }
//   });
// }

// // NEW: Log emergency alert (you can save to MongoDB here)
// function logEmergencyAlert(alert) {
//   // Here you can save to MongoDB
//   console.log(`📊 LOGGED EMERGENCY: ${alert.id} from ${alert.clientId}`);
  
//   // Example MongoDB save (uncomment if you have Emergency model)
//   /*
//   const Emergency = require('./models/Emergency');
//   const emergencyDoc = new Emergency(alert);
//   emergencyDoc.save().catch(err => console.error('Error saving emergency:', err));
//   */
// }

// // Existing WebSocket message handlers
// function handleLocationUpdate(ws, locationData) {
//   const clientData = connectedClients.get(ws);
//   if (clientData) {
//     clientData.location = {
//       ...locationData,
//       lastUpdate: new Date().toISOString()
//     };
    
//     // Broadcast to all other clients
//     broadcastToAll({
//       type: 'location_update',
//       clientId: clientData.id,
//       data: clientData.location,
//       timestamp: new Date().toISOString()
//     }, ws);
    
//     console.log(`📍 Location update from ${clientData.id}:`, {
//       lat: locationData.lat?.toFixed(6),
//       lng: locationData.lng?.toFixed(6)
//     });
//   }
// }

// // Broadcast message to all connected clients except sender
// function broadcastToAll(message, excludeWs = null) {
//   const messageString = JSON.stringify(message);
//   let deliveredCount = 0;

//   connectedClients.forEach((clientData, ws) => {
//     if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
//       try {
//         ws.send(messageString);
//         deliveredCount++;
//       } catch (error) {
//         console.error('Error broadcasting to client:', error);
//       }
//     }
//   });

//   return deliveredCount;
// }

// // Generate unique client ID
// function generateClientId() {
//   return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
// }

// // WebSocket health check
// setInterval(() => {
//   const healthMessage = {
//     type: 'health_check',
//     userCount: connectedClients.size,
//     activeEmergencies: emergencyAlerts.size,
//     timestamp: new Date().toISOString()
//   };

//   broadcastToAll(healthMessage);
  
//   // Clean up dead connections
//   connectedClients.forEach((clientData, ws) => {
//     if (ws.readyState !== WebSocket.OPEN) {
//       removeClientEmergencyAlerts(clientData.id);
//       connectedClients.delete(ws);
//     }
//   });
// }, 30000); // Every 30 seconds

// // NEW: Emergency alerts cleanup (remove old alerts)
// setInterval(() => {
//   const now = new Date();
//   let cleanedCount = 0;
  
//   emergencyAlerts.forEach((alert, alertId) => {
//     const alertTime = new Date(alert.timestamp);
//     const hoursDiff = (now - alertTime) / (1000 * 60 * 60);
    
//     // Remove alerts older than 24 hours
//     if (hoursDiff > 24) {
//       emergencyAlerts.delete(alertId);
//       cleanedCount++;
//     }
//   });
  
//   if (cleanedCount > 0) {
//     console.log(`🧹 Cleaned up ${cleanedCount} old emergency alerts`);
//   }
// }, 3600000); // Every hour

// // Middleware
// app.use(helmet());
// app.use(cors());
// app.use(morgan('combined'));
// app.use(express.json());

// // Routes
// app.get('/', (req, res) => {
//   res.json({ 
//     message: 'Smart Tourist Safety API',
//     database: 'MongoDB',
//     websocket: {
//       enabled: true,
//       connections: connectedClients.size,
//       activeEmergencies: emergencyAlerts.size,
//       endpoint: 'ws://localhost:3000'
//     },
//     endpoints: {
//       geo: '/api/geo',
//       users: '/api/users',
//       blockchain: '/api/users/blockchain/info',
//       emergencies: '/api/emergencies' // NEW endpoint
//     }
//   });
// });

// // NEW: Emergency alerts API endpoint
// app.get('/api/emergencies', (req, res) => {
//   const emergencies = Array.from(emergencyAlerts.values());
//   res.json({
//     activeEmergencies: emergencies.filter(e => e.status === 'active').length,
//     totalEmergencies: emergencies.length,
//     emergencies: emergencies
//   });
// });

// // NEW: Emergency alert by ID
// app.get('/api/emergencies/:id', (req, res) => {
//   const alert = emergencyAlerts.get(req.params.id);
//   if (!alert) {
//     return res.status(404).json({ error: 'Emergency alert not found' });
//   }
//   res.json(alert);
// });

// app.get('/websocket/status', (req, res) => {
//   const clients = Array.from(connectedClients.entries()).map(([ws, data]) => ({
//     id: data.id,
//     connectedAt: data.connectedAt,
//     userType: data.userType,
//     hasLocation: !!data.location,
//     lastUpdate: data.location?.lastUpdate
//   }));

//   res.json({
//     websocketEnabled: true,
//     activeConnections: connectedClients.size,
//     activeEmergencies: emergencyAlerts.size,
//     clients: clients
//   });
// });

// app.use("/api/geo", geoRoutes);
// app.use("/api/users", userRoutes);

// // WebSocket endpoint info
// app.get('/websocket/info', (req, res) => {
//   res.json({
//     websocketUrl: 'ws://localhost:3000',
//     messageTypes: [
//       'location_update',
//       'user_connected', 
//       'user_disconnected',
//       'health_check',
//       'connection_established',
//       'panic_alert', // NEW
//       'panic_acknowledged', // NEW
//       'identify_user', // NEW
//       'emergency_acknowledged', // NEW
//       'emergency_status_update' // NEW
//     ],
//     examplePanicAlert: {
//       type: 'panic_alert',
//       location: {
//         latitude: 28.6139,
//         longitude: 77.2090,
//         accuracy: 10
//       },
//       data: {
//         emergencyType: 'medical',
//         message: 'Need immediate help!'
//       }
//     }
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({ error: 'Endpoint not found' });
// });

// // Error handler
// app.use((error, req, res, next) => {
//   console.error('Server error:', error);
//   res.status(500).json({ error: 'Internal server error' });
// });

// // Start server
// server.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`🗄️  MongoDB: ${MONGODB_URI}`);
//   console.log(`🔗 WebSocket server ready on ws://localhost:${PORT}`);
//   console.log(`👥 Active WebSocket connections: ${connectedClients.size}`);
//   console.log(`🚨 Emergency alert system: ACTIVE`);
//   console.log(`📱 Blockchain user system with MongoDB & WebSocket ready!`);
// });

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM received, shutting down gracefully');
  
//   // Close all WebSocket connections
//   connectedClients.forEach((clientData, ws) => {
//     ws.close(1001, 'Server shutdown');
//   });
  
//   server.close(() => {
//     console.log('Server closed');
//     process.exit(0);
//   });
// });


// module.exports = { 
//   app, 
//   server,
//   broadcastToAll,
//   getConnectedClients: () => connectedClients.size,
//   getEmergencyAlerts: () => emergencyAlerts.size // NEW export
// };

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const geoRoutes = require("./routes/geoRoutes");
const userRoutes = require("./routes/userRoutes");
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false
});

const PORT = process.env.PORT || 3000;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-tourist-safety';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });

// WebSocket connections storage
const connectedClients = new Map();
// Emergency alerts storage
const emergencyAlerts = new Map();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Initialize some sample geofences if none exist
const initializeSampleGeofences = async () => {
  try {
    const Geofence = require('./models/Geofence');
    const count = await Geofence.countDocuments();
    
    if (count === 0) {
      console.log('📝 Creating sample geofences...');
      
      const sampleGeofences = [
        {
          name: 'Main Tourist Area',
          type: 'circle',
          center: { lat: 28.6139, lng: 77.2090 }, // Delhi coordinates
          radius: 5000, // 5km radius
          isActive: true
        },
        {
          name: 'Safety Zone 1',
          type: 'circle',
          center: { lat: 21.1458, lng: 79.0881 }, // Nagpur coordinates
          radius: 3000, // 3km radius
          isActive: true
        }
      ];
      
      await Geofence.insertMany(sampleGeofences);
      console.log('✅ Sample geofences created');
    }
  } catch (error) {
    console.error('❌ Error creating sample geofences:', error);
  }
};

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const clientId = generateClientId();
  console.log(`🔗 New WebSocket connection: ${clientId}`);
  
  connectedClients.set(ws, {
    id: clientId,
    connectedAt: new Date(),
    location: null,
    userType: 'tourist' // default, can be changed later
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection_established',
    clientId: clientId,
    message: 'WebSocket connected successfully',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`📨 Received from ${clientId}:`, data.type);
      
      switch (data.type) {
        case 'location_update':
          handleLocationUpdate(ws, data.data);
          break;
        
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
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
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`🔴 WebSocket disconnected: ${clientId} (Code: ${code})`);
    
    // Remove any emergency alerts from this client
    removeClientEmergencyAlerts(clientId);
    connectedClients.delete(ws);
    
    // Notify other clients about user disconnect
    broadcastToAll({
      type: 'user_disconnected',
      clientId: clientId,
      timestamp: new Date().toISOString()
    }, ws);
  });

  ws.on('error', (error) => {
    console.error(`💥 WebSocket error for ${clientId}:`, error);
    removeClientEmergencyAlerts(clientId);
    connectedClients.delete(ws);
  });

  // Notify about new user connection
  broadcastToAll({
    type: 'user_connected',
    clientId: clientId,
    userCount: connectedClients.size,
    timestamp: new Date().toISOString()
  }, ws);
});

// WebSocket message handlers
function handleLocationUpdate(ws, locationData) {
  const clientData = connectedClients.get(ws);
  if (clientData) {
    clientData.location = {
      ...locationData,
      lastUpdate: new Date().toISOString()
    };
    
    // Broadcast to all other clients
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

  // Store the alert
  emergencyAlerts.set(alertId, emergencyAlert);
  
  console.log(`🚨 PANIC ALERT from ${clientData.id}:`, {
    alertId: alertId,
    location: emergencyAlert.location,
    timestamp: emergencyAlert.timestamp
  });

  // Broadcast to ALL connected clients (including police)
  broadcastToAll(emergencyAlert);

  // Send acknowledgment back to tourist
  ws.send(JSON.stringify({
    type: 'panic_acknowledged',
    alertId: alertId,
    message: 'Emergency services have been notified. Help is on the way!',
    timestamp: new Date().toISOString()
  }));

  // Log to database or external service
  logEmergencyAlert(emergencyAlert);
}

function handleUserIdentification(ws, data) {
  const clientData = connectedClients.get(ws);
  if (clientData && data.userType) {
    clientData.userType = data.userType;
    console.log(`👤 User ${clientData.id} identified as: ${data.userType}`);
    
    // If police connects, send all active emergencies
    if (data.userType === 'police') {
      sendActiveEmergenciesToPolice(ws);
    }
  }
}

function sendActiveEmergenciesToPolice(ws) {
  emergencyAlerts.forEach((alert) => {
    if (alert.status === 'active') {
      ws.send(JSON.stringify(alert));
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
    
    // Notify the original tourist who sent the alert
    broadcastToUser(alert.clientId, {
      type: 'emergency_acknowledged_by_authority',
      alertId: alert.id,
      acknowledgedBy: 'Police',
      timestamp: new Date().toISOString(),
      message: 'Police have acknowledged your emergency and are on the way!'
    });
    
    // Broadcast update to all police
    broadcastToPolice({
      type: 'emergency_status_update',
      alert: alert,
      timestamp: new Date().toISOString()
    });
  }
}

function broadcastToUser(clientId, message) {
  connectedClients.forEach((clientData, ws) => {
    if (clientData.id === clientId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

function broadcastToPolice(message) {
  connectedClients.forEach((clientData, ws) => {
    if (clientData.userType === 'police' && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
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

function broadcastToAll(message, excludeWs = null) {
  const messageString = JSON.stringify(message);
  let deliveredCount = 0;

  connectedClients.forEach((clientData, ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageString);
        deliveredCount++;
      } catch (error) {
        console.error('Error broadcasting to client:', error);
      }
    }
  });

  return deliveredCount;
}

function generateClientId() {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// WebSocket health check
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
}, 30000); // Every 30 seconds

// Emergency alerts cleanup (remove old alerts)
setInterval(() => {
  const now = new Date();
  let cleanedCount = 0;
  
  emergencyAlerts.forEach((alert, alertId) => {
    const alertTime = new Date(alert.timestamp);
    const hoursDiff = (now - alertTime) / (1000 * 60 * 60);
    
    // Remove alerts older than 24 hours
    if (hoursDiff > 24) {
      emergencyAlerts.delete(alertId);
      cleanedCount++;
    }
  });
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} old emergency alerts`);
  }
}, 3600000); // Every hour

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Smart Tourist Safety API',
    database: 'MongoDB',
    websocket: {
      enabled: true,
      connections: connectedClients.size,
      activeEmergencies: emergencyAlerts.size,
      endpoint: 'ws://localhost:3000'
    },
    endpoints: {
      geo: '/api/geo',
      users: '/api/users',
      blockchain: '/api/users/blockchain/info',
      emergencies: '/api/emergencies'
    }
  });
});

// Emergency alerts API endpoint
app.get('/api/emergencies', (req, res) => {
  const emergencies = Array.from(emergencyAlerts.values());
  res.json({
    activeEmergencies: emergencies.filter(e => e.status === 'active').length,
    totalEmergencies: emergencies.length,
    emergencies: emergencies
  });
});

// Emergency alert by ID
app.get('/api/emergencies/:id', (req, res) => {
  const alert = emergencyAlerts.get(req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Emergency alert not found' });
  }
  res.json(alert);
});

app.get('/websocket/status', (req, res) => {
  const clients = Array.from(connectedClients.entries()).map(([ws, data]) => ({
    id: data.id,
    connectedAt: data.connectedAt,
    userType: data.userType,
    hasLocation: !!data.location,
    lastUpdate: data.location?.lastUpdate
  }));

  res.json({
    websocketEnabled: true,
    activeConnections: connectedClients.size,
    activeEmergencies: emergencyAlerts.size,
    clients: clients
  });
});

app.use("/api/geo", geoRoutes);
app.use("/api/users", userRoutes);

// WebSocket endpoint info
app.get('/websocket/info', (req, res) => {
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: error.message 
  });
});

// Initialize sample data and start server
initializeSampleGeofences().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🗄️  MongoDB: ${MONGODB_URI}`);
    console.log(`🔗 WebSocket server ready on ws://localhost:${PORT}`);
    console.log(`👥 Active WebSocket connections: ${connectedClients.size}`);
    console.log(`🚨 Emergency alert system: ACTIVE`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Close all WebSocket connections
  connectedClients.forEach((clientData, ws) => {
    ws.close(1001, 'Server shutdown');
  });
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { 
  app, 
  server,
  broadcastToAll,
  getConnectedClients: () => connectedClients.size,
  getEmergencyAlerts: () => emergencyAlerts.size
};