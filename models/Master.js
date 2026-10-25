// models/Master.js
const mongoose = require('mongoose');

const MasterSchema = new mongoose.Schema({
  masterId: { type: String, required: true, unique: true }, // Жишээ нь: master_1
  name: { type: String, required: true },                    // Нэр
  phone: { type: String, required: true },                   // Утас
  profession: { type: String, required: true },              // Мэргэжил
  experienceYears: { type: Number, required: true },         // Ажилласан жил
  professionalLicenseImg: { type: String },                  // Мэргэжлийн үнэмлэхний зураг (URL)
  idCardImg: { type: String },                               // Иргэний үнэмлэхний зураг (URL)
  portfolioImages: [{ type: String }],                       // Гүйцэтгэсэн ажлын зургууд
  referencePhone: { type: String },                          // Лавлах утас
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Master', MasterSchema);