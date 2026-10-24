const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  serviceType: { type: String, required: true }, // Плита, Сантехник гэх мэт
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'NO_MASTER_AVAILABLE', 'CANCELLED'], 
    default: 'PENDING' 
  },
  currentMasterIndex: { type: Number, default: 0 },
  assignedMasterIds: [{ type: String }], // Эрэмбэлэгдсэн мастеруудын ID
  acceptedMasterId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', jobSchema);