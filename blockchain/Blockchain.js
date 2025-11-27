const Block = require('./Block');
const BlockModel = require('../models/Block');

class Blockchain {
  constructor() {
    this.difficulty = 2;
  }

  async initialize() {
    // Check if genesis block exists
    const genesisExists = await BlockModel.findOne({ index: 0 });
    if (!genesisExists) {
      await this.createGenesisBlock();
    }
  }

  async createGenesisBlock() {
    const genesisBlock = new Block(
      Date.now(), 
      { 
        userId: 'genesis',
        action: 'genesis',
        details: 'First block in the chain'
      }, 
      '0'
    );
    
    genesisBlock.mineBlock(this.difficulty);
    
    const savedBlock = new BlockModel({
      blockId: genesisBlock.id,
      timestamp: genesisBlock.timestamp,
      data: genesisBlock.data,
      previousHash: genesisBlock.previousHash,
      hash: genesisBlock.hash,
      nonce: genesisBlock.nonce,
      index: 0
    });
    
    await savedBlock.save();
    console.log('Genesis block created and saved to MongoDB');
  }

  async getLatestBlock() {
    return await BlockModel.findOne().sort({ index: -1 });
  }

  async createUserBlock(userData) {
    const latestBlock = await this.getLatestBlock();
    const newBlock = new Block(
      Date.now(),
      {
        userId: userData.userId,
        action: 'user_registration',
        details: userData
      },
      latestBlock.hash
    );
    
    newBlock.mineBlock(this.difficulty);
    
    const savedBlock = new BlockModel({
      blockId: newBlock.id,
      timestamp: newBlock.timestamp,
      data: newBlock.data,
      previousHash: newBlock.previousHash,
      hash: newBlock.hash,
      nonce: newBlock.nonce,
      index: latestBlock.index + 1
    });
    
    await savedBlock.save();
    return savedBlock;
  }

  async addUserAction(userId, action, details) {
    const latestBlock = await this.getLatestBlock();
    const newBlock = new Block(
      Date.now(),
      {
        userId,
        action,
        details
      },
      latestBlock.hash
    );
    
    newBlock.mineBlock(this.difficulty);
    
    const savedBlock = new BlockModel({
      blockId: newBlock.id,
      timestamp: newBlock.timestamp,
      data: newBlock.data,
      previousHash: newBlock.previousHash,
      hash: newBlock.hash,
      nonce: newBlock.nonce,
      index: latestBlock.index + 1
    });
    
    await savedBlock.save();
    return savedBlock;
  }

  async isChainValid() {
    const blocks = await BlockModel.find().sort({ index: 1 });
    
    for (let i = 1; i < blocks.length; i++) {
      const currentBlock = blocks[i];
      const previousBlock = blocks[i - 1];

      // Recalculate hash
      const block = new Block(
        currentBlock.timestamp,
        currentBlock.data,
        currentBlock.previousHash
      );
      block.nonce = currentBlock.nonce;
      
      if (currentBlock.hash !== block.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }

  async getUserHistory(userId) {
    return await BlockModel.find({ 'data.userId': userId }).sort({ index: 1 });
  }

  async getAllBlocks() {
    return await BlockModel.find().sort({ index: 1 });
  }

  async getBlockchainStats() {
    const totalBlocks = await BlockModel.countDocuments();
    const latestBlock = await this.getLatestBlock();
    const isValid = await this.isChainValid();
    
    return {
      totalBlocks,
      latestBlock: latestBlock ? latestBlock.hash : 'No blocks',
      chainValid: isValid,
      latestIndex: latestBlock ? latestBlock.index : 0
    };
  }
}

module.exports = Blockchain;