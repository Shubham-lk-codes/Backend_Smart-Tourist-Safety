const express = require('express');
const router = express.Router();
const safeZoneController = require('../controllers/safeZoneController');
const emergencyContactController = require('../controllers/emergencyContactController');

// Safe Zone Routes
router.get('/safe-zones', safeZoneController.getSafeZones);
router.get('/safe-zones/type/:type', safeZoneController.getSafeZonesByType);
router.get('/safe-zones/nearby', safeZoneController.getNearestSafeZones);

// Emergency Contact Routes
router.get('/emergency-contacts', emergencyContactController.getEmergencyContacts);
router.get('/emergency-contacts/type/:type', emergencyContactController.getEmergencyContactsByType);

module.exports = router;