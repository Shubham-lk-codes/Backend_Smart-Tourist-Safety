const mongoose = require('mongoose');

const alertHistorySchema = new mongoose.Schema({
    alertId: {
        type: String,
        required: true,
        unique: true
    },
    touristId: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['PANIC_ALERT', 'ML_ANOMALY', 'GEOFENCE_VIOLATION', 'PHONE_OFF', 'OTHER'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    location: {
        latitude: Number,
        longitude: Number,
        accuracy: Number
    },
    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM'
    },
    acknowledged: {
        type: Boolean,
        default: false
    },
    acknowledgedBy: String,
    acknowledgedAt: Date,
    resolved: {
        type: Boolean,
        default: false
    },
    resolvedBy: String,
    resolvedAt: Date,
    resolution: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Indexes for faster queries
alertHistorySchema.index({ touristId: 1, timestamp: -1 });
alertHistorySchema.index({ type: 1, timestamp: -1 });
alertHistorySchema.index({ severity: 1, timestamp: -1 });
alertHistorySchema.index({ acknowledged: 1, resolved: 1 });

module.exports = mongoose.model('AlertHistory', alertHistorySchema);