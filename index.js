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
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// WebSocket connections storage
const connectedClients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = generateClientId();
  console.log(`🔗 New WebSocket connection: ${clientId}`);
  
  connectedClients.set(ws, {
    id: clientId,
    connectedAt: new Date(),
    location: null
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
      lat: locationData.lat.toFixed(6),
      lng: locationData.lng.toFixed(6)
    });
  }
}

// Broadcast message to all connected clients except sender
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

// Generate unique client ID
function generateClientId() {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// WebSocket health check
setInterval(() => {
  const healthMessage = {
    type: 'health_check',
    userCount: connectedClients.size,
    timestamp: new Date().toISOString()
  };

  broadcastToAll(healthMessage);
  
  // Clean up dead connections
  connectedClients.forEach((clientData, ws) => {
    if (ws.readyState !== WebSocket.OPEN) {
      connectedClients.delete(ws);
    }
  });
}, 30000); // Every 30 seconds

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Smart Tourist Safety API',
    database: 'MongoDB',
    websocket: {
      enabled: true,
      connections: connectedClients.size,
      endpoint: 'ws://localhost:3000'
    },
    endpoints: {
      geo: '/api/geo',
      users: '/api/users',
      blockchain: '/api/users/blockchain/info'
    }
  });
});

app.get('/websocket/status', (req, res) => {
  const clients = Array.from(connectedClients.entries()).map(([ws, data]) => ({
    id: data.id,
    connectedAt: data.connectedAt,
    hasLocation: !!data.location,
    lastUpdate: data.location?.lastUpdate
  }));

  res.json({
    websocketEnabled: true,
    activeConnections: connectedClients.size,
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
      'connection_established'
    ],
    exampleMessage: {
      type: 'location_update',
      data: {
        lat: 28.6139,
        lng: 77.2090,
        accuracy: 10,
        timestamp: new Date().toISOString()
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
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🗄️  MongoDB: ${MONGODB_URI}`);
  console.log(`🔗 WebSocket server ready on ws://localhost:${PORT}`);
  console.log(`👥 Active WebSocket connections: ${connectedClients.size}`);
  console.log(`📱 Blockchain user system with MongoDB & WebSocket ready!`);
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
  getConnectedClients: () => connectedClients.size
};