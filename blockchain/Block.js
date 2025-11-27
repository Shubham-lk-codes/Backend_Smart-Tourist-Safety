const SHA256 = require('crypto-js/sha256');
const { v4: uuidv4 } = require('uuid');

class Block {
  constructor(timestamp, data, previousHash = '') {
    this.id = uuidv4();
    this.timestamp = timestamp;
    this.data = data; // User data: { userId, action, details }
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
    this.nonce = 0;
  }

  calculateHash() {
    return SHA256(
      this.id +
      this.previousHash +
      this.timestamp +
      JSON.stringify(this.data) +
      this.nonce
    ).toString();
  }

  mineBlock(difficulty) {
    while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log(`Block mined: ${this.hash}`);
  }
}

module.exports = Block;