const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// User routes
router.post('/register', userController.registerUser);
router.get('/:userId', userController.getUser);
router.get('/:userId/activities', userController.getActivities);
router.post('/:userId/activities', userController.addActivity);

// Admin routes
router.get('/', userController.getAllUsers);
router.get('/blockchain/info', userController.getBlockchainInfo);

module.exports = router;