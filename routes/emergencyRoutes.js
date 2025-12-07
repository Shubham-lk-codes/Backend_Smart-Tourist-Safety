// const express = require('express');
// const router = express.Router();
// const { 
//   getEmergencies, 
//   getEmergencyById,
//   createPanicAlert ,
//  handleMLAlert,           // ADD THIS
//     processTouristLocations, // ADD THIS  
//     getMLSystemStatus 
//    // Import the new function
// } = require('../controllers/emergencyController');

// router.get('/', getEmergencies);
// router.get('/:id', getEmergencyById);
// router.post('/panic-alert', createPanicAlert); 
// router.post('/ml-alert', handleMLAlert); // Add new route

// module.exports = router;

// routes/emergencyRoutes.js
const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');

// Get all emergencies
router.get('/', emergencyController.getEmergencies);

// Get specific emergency by ID
router.get('/:id', emergencyController.getEmergencyById);

// Create panic alert
router.post('/panic-alert', emergencyController.createPanicAlert);

// Acknowledge emergency
router.post('/:id/acknowledge', emergencyController.acknowledgeEmergency);

// Resolve emergency
router.post('/:id/resolve', emergencyController.resolveEmergency);

// Handle ML alerts (for ML service to send alerts)
router.post('/ml-alert', emergencyController.handleMLAlert);

module.exports = router;