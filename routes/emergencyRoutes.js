const express = require('express');
const router = express.Router();
const { 
  getEmergencies, 
  getEmergencyById,
  createPanicAlert  // Import the new function
} = require('../controllers/emergencyController');

router.get('/', getEmergencies);
router.get('/:id', getEmergencyById);
router.post('/panic-alert', createPanicAlert);  // Add new route

module.exports = router;