const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Book = require('../models/Book');
const IssuedBook = require('../models/IssuedBook');
const Setting = require('../models/Setting');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// Add staff
router.post('/add-staff', async (req, res) => {
  try {
    const { name, staffId, password } = req.body;
    
    const existing = await User.findOne({ staffId });
    if (existing) {
      return res.status(400).json({ message: 'Staff ID already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const staff = await User.create({
      name,
      staffId,
      password: hashedPassword,
      role: 'staff'
    });
    
    res.json({ message: 'Staff added successfully', staff });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove staff
router.delete('/remove-staff/:id', async (req, res) => {
  try {
    const staff = await User.findOneAndDelete({ _id: req.params.id, role: 'staff' });
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }
    res.json({ message: 'Staff removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all staff
router.get('/staff', async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }).select('-password');
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalIssued = await IssuedBook.countDocuments({ returned: false });
    const books = await Book.find();
    const totalAvailable = books.reduce((sum, book) => sum + book.availableCopies, 0);
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalStaff = await User.countDocuments({ role: 'staff' });
    
    res.json({
      totalIssued,
      totalAvailable,
      totalStudents,
      totalStaff
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await Setting.findOne();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update settings
router.put('/settings', async (req, res) => {
  try {
    const { finePerDay, returnPeriodDays } = req.body;
    let settings = await Setting.findOne();
    if (settings) {
      settings.finePerDay = finePerDay;
      settings.returnPeriodDays = returnPeriodDays;
      await settings.save();
    } else {
      settings = await Setting.create({ finePerDay, returnPeriodDays });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;