const express = require('express');
const router = express.Router();
const geoController = require('../controllers/geoController');

router.get('/check', geoController.checkLocation);
router.get('/geofences', geoController.getGeofences);
router.get('/nearest', geoController.findNearest);
router.post('/geofences', geoController.addGeofence);
router.put('/geofences/:id', geoController.updateGeofence);
router.delete('/geofences/:id', geoController.deleteGeofence);

module.exports = router;