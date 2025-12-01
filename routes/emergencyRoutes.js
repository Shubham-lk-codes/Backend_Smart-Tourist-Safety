const express = require('express');
const router = express.Router();
const { getEmergencies, getEmergencyById } = require('../controllers/emergencyController');

router.get('/', getEmergencies);
router.get('/:id', getEmergencyById);

module.exports = router;