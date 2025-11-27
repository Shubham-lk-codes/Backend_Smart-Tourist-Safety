const UserManager = require('../blockchain/UserManager');

const userManager = new UserManager();

// Initialize when server starts
userManager.initialize().catch(console.error);

const userController = {
  // Register new user
  registerUser: async (req, res) => {
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
        location: location || ''
      };

      const user = await userManager.registerUser(userData);

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
        error: 'Internal server error: ' + error.message
      });
    }
  },

  // Get user details
  getUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const verification = await userManager.verifyUser(userId);

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
  addActivity: async (req, res) => {
    try {
      const { userId } = req.params;
      const { activityType, details } = req.body;

      if (!activityType) {
        return res.status(400).json({
          error: 'Activity type is required'
        });
      }

      const activity = await userManager.addUserActivity(userId, activityType, details);

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
  getActivities: async (req, res) => {
    try {
      const { userId } = req.params;
      const activities = await userManager.getUserActivities(userId);

      res.json({
        userId,
        activities: activities.map(activity => ({
          activityType: activity.activityType,
          details: activity.details,
          timestamp: activity.timestamp,
          blockHash: activity.blockHash
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
  getAllUsers: async (req, res) => {
    try {
      const users = await userManager.getAllUsers();
      const stats = await userManager.getBlockchainStats();

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
  getBlockchainInfo: async (req, res) => {
    try {
      const stats = await userManager.getBlockchainStats();
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