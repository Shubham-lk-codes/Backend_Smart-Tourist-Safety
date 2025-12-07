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

// NEW: Create simple ML routes if not available
const createMLRoutes = () => {
  const router = require('express').Router();
  
  router.get('/test', (req, res) => {
    res.json({ message: 'ML API is working!' });
  });
  
  router.get('/status', (req, res) => {
    res.json({ 
      ml_service: 'available', 
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  });
  
  router.post('/detect', async (req, res) => {
    try {
      const { tourist_id, latitude, longitude } = req.body;
      
      // Simulate ML detection
      const result = {
        tourist_id,
        anomaly_score: 0.1,
        is_anomalous: false,
        alerts: [],
        location: { lat: latitude, lng: longitude },
        timestamp: new Date().toISOString(),
        phone_status: 'online'
      };
      
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  return router;
};

// Use routes
app.use("/api/geo", geoRoutes);
app.use("/api/users", userRoutes);
app.use("/api/emergencies", emergencyRoutes);
app.use("/websocket", websocketRoutes);
app.use("/api", safetyRoutes); 

// NEW: Use ML routes (simple version)
app.use("/api/ml", createMLRoutes());

// Initialize WebSocket
const { initializeWebSocket } = require('./controllers/websocketController');
initializeWebSocket(server);

// Initialize sample data
const { initializeSampleGeofences } = require('./controllers/geoController.js');
const { initializeSampleSafeZones } = require('./controllers/safeZoneController');
const { initializeSampleEmergencyContacts } = require('./controllers/emergencyContactController');

initializeSampleGeofences();
initializeSampleSafeZones();
initializeSampleEmergencyContacts();

// NEW: Test ML service connection
const testMLService = () => {
  const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';
  console.log(`🤖 ML Service URL: ${ML_API_URL}`);
  console.log('   To start ML service: cd backend/ml_model && python anomaly_detector.py');
};

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Smart Tourist Safety API',
    version: '2.0',
    database: 'MongoDB',
    websocket: {
      enabled: true,
      endpoint: 'ws://localhost:3000'
    },
    ml_integration: {
      enabled: true,
      endpoint: '/api/ml'
    },
    endpoints: {
      geo: '/api/geo',
      users: '/api/users',
      emergencies: '/api/emergencies',
      ml: '/api/ml',
      websocket: '/websocket',
      safety: '/api'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      websocket: 'active',
      ml: 'available'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    available_endpoints: {
      home: '/',
      health: '/health',
      geo: '/api/geo',
      users: '/api/users',
      emergencies: '/api/emergencies',
      ml: '/api/ml',
      websocket: '/websocket'
    }
  });
});

// Error handler
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
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🗄️  MongoDB: ${MONGODB_URI}`);
  console.log(`🔗 WebSocket server ready on ws://localhost:${PORT}`);
  console.log(`🌐 Frontend: http://localhost:5173`);
  console.log(`📊 Available Endpoints:`);
  console.log(`   • Main API: http://localhost:${PORT}`);
  console.log(`   • Geo API: http://localhost:${PORT}/api/geo`);
  console.log(`   • Emergency API: http://localhost:${PORT}/api/emergencies`);
  console.log(`   • ML API: http://localhost:${PORT}/api/ml`);
  console.log(`   • Health Check: http://localhost:${PORT}/health`);
  
  // Test ML service
  testMLService();
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