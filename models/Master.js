const mongoose = require('mongoose');

const MasterSchema = new mongoose.Schema({
  masterId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  serviceType: { type: String, required: true },
  rating: { type: Number, default: 5.0 },
  phone: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Master', MasterSchema);