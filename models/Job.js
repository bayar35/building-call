// models/Job.js
const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  clientName: { type: String, required: true },
  serviceType: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'COMPLETED', 'NO_MASTER_AVAILABLE', 'CANCELLED'], 
    default: 'PENDING' 
  },
  currentMasterIndex: { type: Number, default: 0 },
  assignedMasterIds: [{ type: String }],
  
  // Мастеруудад илгээсэн болон хариу өгсөн түүх (Дэлгэрэнгүй лог)
  dispatchHistory: [
    {
      masterId: { type: String },
      sentAt: { type: Date, default: Date.now },           // Илгээсэн он сар өдөр цаг
      action: { type: String, enum: ['PENDING', 'ACCEPT', 'REJECT', 'TIMEOUT'], default: 'PENDING' },
      respondedAt: { type: Date }                          // Хүлээн авсан эсвэл татгалзсан цаг
    }
  ],

  acceptedMasterId: { type: String, default: null },
  completedAt: { type: Date },                             // Гүйцэтгэсэн он сар өдөр цаг
  resultSummary: { type: String },                         // Үр дүнгийн тайлбар
  rating: { type: Number, min: 1, max: 5 },                // Үнэлгээ (1-5 од)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', JobSchema);