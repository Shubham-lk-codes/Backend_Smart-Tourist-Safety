// routes/geoRoutes.js
const express = require('express');
const router = express.Router();
const geoController = require('../controllers/geoController');

// Check if location is within geofence
router.get('/check', geoController.checkLocation);

// Get all geofences
router.get('/boundaries', geoController.getGeofences);

// Add new geofence
router.post('/add', geoController.addGeofence);

module.exports = router;