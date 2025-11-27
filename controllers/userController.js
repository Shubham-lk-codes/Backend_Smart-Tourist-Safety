const UserManager = require('../blockchain/UserManager');

const userManager = new UserManager();

const userController = {
  // Register new user
  registerUser: (req, res) => {
    try {
      const { name, email, phone, location } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          error: 'Name and email are required'
        });
      }

      const userData = {
        name,
        email,
        phone: phone || '',
        location: location || '',
        registeredAt: new Date().toISOString()
      };

      const user = userManager.registerUser(userData);

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          blockId: user.blockId,
          blockHash: user.blockHash,
          timestamp: user.timestamp
        }
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  // Get user details
  getUser: (req, res) => {
    try {
      const { userId } = req.params;
      const verification = userManager.verifyUser(userId);

      if (!verification.verified) {
        return res.status(404).json({
          error: 'User not found or verification failed'
        });
      }

      res.json({
        user: verification.user,
        blockchainVerified: verification.blockchainVerified,
        blockData: verification.blockData
      });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  // Add user activity
  addActivity: (req, res) => {
    try {
      const { userId } = req.params;
      const { activityType, details } = req.body;

      if (!activityType) {
        return res.status(400).json({
          error: 'Activity type is required'
        });
      }

      const activity = userManager.addUserActivity(userId, activityType, details);

      res.json({
        message: 'Activity recorded successfully',
        activity: activity.activity,
        blockId: activity.blockId,
        blockHash: activity.blockHash
      });
    } catch (error) {
      console.error('Error adding activity:', error);
      res.status(500).json({
        error: error.message
      });
    }
  },

  // Get user activities
  getActivities: (req, res) => {
    try {
      const { userId } = req.params;
      const activities = userManager.getUserActivities(userId);

      res.json({
        userId,
        activities: activities.map(block => ({
          activityType: block.data.action,
          details: block.data.details,
          timestamp: block.timestamp,
          blockHash: block.hash
        }))
      });
    } catch (error) {
      console.error('Error getting activities:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  // Get all users
  getAllUsers: (req, res) => {
    try {
      const users = userManager.getAllUsers();
      const stats = userManager.getBlockchainStats();

      res.json({
        stats,
        users: users.map(user => ({
          userId: user.userId,
          name: user.name,
          email: user.email,
          registeredAt: user.timestamp,
          blockId: user.blockId
        }))
      });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  // Get blockchain info
  getBlockchainInfo: (req, res) => {
    try {
      const stats = userManager.getBlockchainStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting blockchain info:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
};

module.exports = userController;