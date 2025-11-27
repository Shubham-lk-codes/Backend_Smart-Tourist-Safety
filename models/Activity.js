const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true 
  },
  activityType: { 
    type: String, 
    required: true 
  },
  details: mongoose.Schema.Types.Mixed,
  blockId: String,
  blockHash: String,
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for faster queries
activitySchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Activity', activitySchema);