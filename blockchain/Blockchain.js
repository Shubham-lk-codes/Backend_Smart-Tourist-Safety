const Block = require('./Block');

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 2;
    this.pendingUsers = [];
  }

  createGenesisBlock() {
    return new Block(Date.now(), { 
      userId: 'genesis',
      action: 'genesis',
      details: 'First block in the chain'
    }, '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  createUserBlock(userData) {
    const newBlock = new Block(
      Date.now(),
      {
        userId: userData.userId,
        action: 'user_registration',
        details: userData
      },
      this.getLatestBlock().hash
    );
    
    newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);
    return newBlock;
  }

  addUserAction(userId, action, details) {
    const newBlock = new Block(
      Date.now(),
      {
        userId,
        action,
        details
      },
      this.getLatestBlock().hash
    );
    
    newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);
    return newBlock;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }

  getUserHistory(userId) {
    return this.chain.filter(block => 
      block.data.userId === userId
    );
  }

  getAllUsers() {
    const users = {};
    this.chain.forEach(block => {
      if (block.data.action === 'user_registration') {
        users[block.data.userId] = block.data.details;
      }
    });
    return users;
  }
}

module.exports = Blockchain;