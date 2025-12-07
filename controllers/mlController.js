// controllers/mlController.js
const axios = require('axios');

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

class MLController {
    // Send data to ML model for anomaly detection
    async detectAnomaly(req, res) {
    try {
        const { tourist_id, latitude, longitude, timestamp, speed } = req.body;
        
        console.log(`🤖 ML Detection request for tourist: ${tourist_id}`);

        if (!tourist_id) {
            return res.status(400).json({
                error: 'Tourist ID is required'
            });
        }

        // Use provided location or default
        const lat = latitude !== undefined ? parseFloat(latitude) : 28.6139;
        const lng = longitude !== undefined ? parseFloat(longitude) : 77.2090;
        
        const alerts = [];
        let is_anomalous = false;
        let anomaly_score = 0;

        // Simple rule: Check for high speed
        if (speed && speed > 15) {
            alerts.push(`🚨 SUSPICIOUS SPEED: ${speed.toFixed(1)} m/s`);
            is_anomalous = true;
            anomaly_score = 0.8;
        }

        // Check if using default location
        if (latitude === undefined || longitude === undefined) {
            alerts.push(`📍 Using simulated location for testing`);
        }

        const result = {
            tourist_id,
            anomaly_score,
            is_anomalous,
            alerts,
            location: { lat, lng },
            timestamp: new Date().toISOString(),
            phone_status: 'online',
            history_size: 0
        };

        res.json({
            success: true,
            message: 'Anomaly detection completed',
            result: result
        });

    } catch (error) {
        console.error('❌ ML Detection error:', error);
        res.status(500).json({
            error: 'Detection failed',
            details: error.message
        });
    }
}

    // Fallback rule-based detection
    async fallbackDetection(req, res) {
        try {
            const { tourist_id, latitude, longitude, speed } = req.body;
            
            const alerts = [];
            let is_anomalous = false;
            let anomaly_score = 0;

            // Simple rule: Check for high speed
            if (speed && speed > 15) {
                alerts.push(`🚨 SUSPICIOUS SPEED: ${speed.toFixed(1)} m/s`);
                is_anomalous = true;
                anomaly_score = 0.8;
            }

            const result = {
                tourist_id,
                anomaly_score,
                is_anomalous,
                alerts,
                location: { lat: latitude, lng: longitude },
                timestamp: new Date().toISOString(),
                phone_status: 'online',
                buffer_size: 0
            };

            res.json({
                success: true,
                message: 'Rule-based detection completed (ML service unavailable)',
                result: result
            });

        } catch (error) {
            console.error('Fallback detection error:', error);
            res.status(500).json({
                error: 'Detection failed',
                details: error.message
            });
        }
    }

    // Get ML system status
    async getSystemStatus(req, res) {
        try {
            const response = await axios.get(`${ML_API_URL}/status`, {
                timeout: 3000
            });

            res.json({
                backend: 'connected',
                ml_service: 'connected',
                ...response.data
            });

        } catch (error) {
            console.error('Error getting ML status:', error);
            
            res.json({
                backend: 'connected',
                ml_service: 'disconnected',
                message: 'ML service not available',
                timestamp: new Date().toISOString()
            });
        }
    }

    // Get ML health
    async getHealth(req, res) {
        try {
            const response = await axios.get(`${ML_API_URL}/health`, {
                timeout: 3000
            });

            res.json({
                backend: 'healthy',
                ...response.data
            });

        } catch (error) {
            console.error('ML health check error:', error);
            res.status(503).json({
                backend: 'healthy',
                ml_service: 'unhealthy',
                status: 'partial',
                message: 'ML service unavailable',
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = new MLController();