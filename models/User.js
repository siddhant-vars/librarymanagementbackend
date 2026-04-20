const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Common fields
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff', 'student'], required: true },
  password: { type: String, required: true },
  
  // Admin specific
  email: { type: String, unique: true, sparse: true },
  
  // Staff specific
  staffId: { type: String, unique: true, sparse: true },
  
  // Student specific
  enrollmentNo: { type: String, unique: true, sparse: true },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);