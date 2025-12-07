// routes/mlRoutes.js
const express = require('express');
const router = express.Router();
const mlController = require('../controllers/mlController');

// ML Detection Routes
router.post('/detect', mlController.detectAnomaly);
router.get('/status', mlController.getSystemStatus);
router.get('/health', mlController.getHealth);

// Test endpoint
router.get('/test', (req, res) => {
    res.json({
        message: 'ML API is working!',
        endpoints: {
            detect: 'POST /api/ml/detect',
            status: 'GET /api/ml/status',
            health: 'GET /api/ml/health'
        }
    });
});

// Simulate anomaly
router.post('/simulate', (req, res) => {
    const { tourist_id } = req.body;
    
    const result = {
        tourist_id: tourist_id || 'test_tourist',
        anomaly_score: 0.9,
        is_anomalous: true,
        alerts: ['🚨 SIMULATED: High speed anomaly detected'],
        location: { lat: 28.6139, lng: 77.2090 },
        timestamp: new Date().toISOString()
    };
    
    res.json({
        success: true,
        message: 'Anomaly simulated successfully',
        result: result
    });
});

module.exports = router;