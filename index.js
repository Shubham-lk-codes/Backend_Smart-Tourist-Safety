

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

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

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());


// Import routes
const geoRoutes = require("./routes/geoRoutes");
const userRoutes = require("./routes/userRoutes");
const emergencyRoutes = require("./routes/emergencyRoutes");
const websocketRoutes = require("./routes/websocketRoutes");
const safetyRoutes = require("./routes/safetyRoutes");
const { initializeSampleSafeZones } = require('./controllers/safeZoneController');
const { initializeSampleEmergencyContacts } = require('./controllers/emergencyContactController');

// Use routes
app.use("/api/geo", geoRoutes);
app.use("/api/users", userRoutes);
app.use("/api/emergencies", emergencyRoutes);
app.use("/websocket", websocketRoutes);
app.use("/api", safetyRoutes); 

// Initialize WebSocket
const {   initializeWebSocket,
 } = require('./controllers/websocketController');
initializeWebSocket(server);

// Initialize sample data
const { initializeSampleGeofences } = require('./controllers/geoController.js');
initializeSampleGeofences();
initializeSampleSafeZones();
initializeSampleEmergencyContacts();

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Smart Tourist Safety API',
    database: 'MongoDB',
    websocket: {
      enabled: true,
      endpoint: 'ws://localhost:3000'
    },
    endpoints: {
      geo: '/api/geo',
      users: '/api/users',
      emergencies: '/api/emergencies',
      websocket: '/websocket'
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

// Error handler - FIXED with proper signature
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  // Handle JSON parsing errors
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ 
      error: 'Invalid JSON in request body',
      details: error.message 
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🗄️  MongoDB: ${MONGODB_URI}`);
  console.log(`🔗 WebSocket server ready on ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };