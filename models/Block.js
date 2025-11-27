const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  blockId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  data: {
    userId: String,
    action: String,
    details: mongoose.Schema.Types.Mixed
  },
  previousHash: String,
  hash: { 
    type: String, 
    required: true 
  },
  nonce: { 
    type: Number, 
    default: 0 
  },
  index: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Block', blockSchema);