const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  finePerDay: { type: Number, required: true, default: 5 },
  returnPeriodDays: { type: Number, required: true, default: 14 }
});

module.exports = mongoose.model('Setting', settingSchema);
