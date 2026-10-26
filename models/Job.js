const mongoose = require('mongoose');

const DispatchHistorySchema = new mongoose.Schema({
  masterId: String,
  sentAt: Date,
  respondedAt: Date,
  action: { type: String, enum: ['PENDING', 'ACCEPT', 'REJECT', 'TIMEOUT'], default: 'PENDING' }
});

const JobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  clientName: { type: String, required: true },
  serviceType: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'NO_MASTER_AVAILABLE'], 
    default: 'PENDING' 
  },
  currentMasterIndex: { type: Number, default: 0 },
  assignedMasterIds: [String],
  acceptedMasterId: { type: String, default: null },
  dispatchHistory: [DispatchHistorySchema],
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  timeDiffText: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);