const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, unique: true }, 
  fullName: { type: String },
  bloodType: { type: String },
  insuranceProvider: { type: String },
  policyNumber: { type: String },
  emergencyContactName: { type: String },
  emergencyContactPhone: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);