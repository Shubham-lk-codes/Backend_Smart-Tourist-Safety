const { v4: uuidv4 } = require('uuid');
const Blockchain = require('./Blockchain');

class UserManager {
  constructor() {
    this.blockchain = new Blockchain();
    this.users = new Map(); // In-memory storage (use database in production)
  }

  generateUserId() {
    return `user_${uuidv4()}`;
  }

  registerUser(userData) {
    const userId = this.generateUserId();
    const userRecord = {
      userId,
      ...userData,
      timestamp: new Date().toISOString(),
      blockId: null
    };

    // Add to blockchain
    const block = this.blockchain.createUserBlock(userRecord);
    userRecord.blockId = block.id;
    userRecord.blockHash = block.hash;

    // Store in memory
    this.users.set(userId, userRecord);

    return userRecord;
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  verifyUser(userId) {
    const user = this.getUser(userId);
    if (!user) return { verified: false, reason: 'User not found' };

    // Verify in blockchain
    const userHistory = this.blockchain.getUserHistory(userId);
    const registrationBlock = userHistory.find(block => 
      block.data.action === 'user_registration'
    );

    if (!registrationBlock) {
      return { verified: false, reason: 'User not found in blockchain' };
    }

    return { 
      verified: true, 
      user: user,
      blockData: registrationBlock.data,
      blockchainVerified: this.blockchain.isChainValid()
    };
  }

  addUserActivity(userId, activityType, details) {
    const user = this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const activity = {
      activityType,
      details,
      timestamp: new Date().toISOString()
    };

    // Add to blockchain
    const block = this.blockchain.addUserAction(userId, activityType, activity);
    
    return {
      activity,
      blockId: block.id,
      blockHash: block.hash
    };
  }

  getUserActivities(userId) {
    const history = this.blockchain.getUserHistory(userId);
    return history.filter(block => 
      block.data.action !== 'user_registration'
    );
  }

  getBlockchainStats() {
    return {
      totalBlocks: this.blockchain.chain.length,
      totalUsers: this.users.size,
      chainValid: this.blockchain.isChainValid(),
      latestBlock: this.blockchain.getLatestBlock().hash
    };
  }
}

module.exports = UserManager;