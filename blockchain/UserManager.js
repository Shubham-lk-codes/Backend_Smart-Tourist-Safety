const { v4: uuidv4 } = require('uuid');
const Blockchain = require('./Blockchain');
const User = require('../models/User');
const Activity = require('../models/Activity');

class UserManager {
  constructor() {
    this.blockchain = new Blockchain();
  }

  async initialize() {
    await this.blockchain.initialize();
  }

  generateUserId() {
    return `user_${uuidv4()}`;
  }

  async registerUser(userData) {
    const userId = this.generateUserId();
    const userRecord = {
      userId,
      ...userData,
      timestamp: new Date()
    };

    // Add to blockchain
    const block = await this.blockchain.createUserBlock(userRecord);
    userRecord.blockId = block.blockId;
    userRecord.blockHash = block.hash;

    // Save to MongoDB
    const user = new User(userRecord);
    await user.save();

    return userRecord;
  }

  async getUser(userId) {
    return await User.findOne({ userId });
  }

  async getAllUsers() {
    return await User.find({ isActive: true }).sort({ timestamp: -1 });
  }

  async verifyUser(userId) {
    const user = await this.getUser(userId);
    if (!user) {
      return { verified: false, reason: 'User not found' };
    }

    // Verify in blockchain
    const userHistory = await this.blockchain.getUserHistory(userId);
    const registrationBlock = userHistory.find(block => 
      block.data.action === 'user_registration'
    );

    if (!registrationBlock) {
      return { verified: false, reason: 'User not found in blockchain' };
    }

    const isValid = await this.blockchain.isChainValid();

    return { 
      verified: true, 
      user: user,
      blockData: registrationBlock.data,
      blockchainVerified: isValid
    };
  }

  async addUserActivity(userId, activityType, details) {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const activityData = {
      activityType,
      details,
      timestamp: new Date()
    };

    // Add to blockchain
    const block = await this.blockchain.addUserAction(userId, activityType, activityData);
    
    // Save to Activity collection
    const activity = new Activity({
      userId,
      activityType,
      details,
      blockId: block.blockId,
      blockHash: block.hash,
      timestamp: activityData.timestamp
    });
    
    await activity.save();

    return {
      activity: activityData,
      blockId: block.blockId,
      blockHash: block.hash
    };
  }

  async getUserActivities(userId) {
    return await Activity.find({ userId }).sort({ timestamp: -1 });
  }

  async getBlockchainStats() {
    const userStats = await User.aggregate([
      { $match: { isActive: true } },
      { $count: 'totalUsers' }
    ]);

    const activityStats = await Activity.aggregate([
      { $group: { _id: '$activityType', count: { $sum: 1 } } }
    ]);

    const blockchainStats = await this.blockchain.getBlockchainStats();

    return {
      ...blockchainStats,
      totalUsers: userStats[0]?.totalUsers || 0,
      activityTypes: activityStats
    };
  }

  async deactivateUser(userId) {
    return await User.findOneAndUpdate(
      { userId },
      { isActive: false },
      { new: true }
    );
  }
}

module.exports = UserManager;