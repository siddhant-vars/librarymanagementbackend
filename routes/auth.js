const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { loginId, password, role } = req.body;
    
    let user;
    if (role === 'admin') {
      user = await User.findOne({ email: loginId, role: 'admin' });
    } else if (role === 'staff') {
      user = await User.findOne({ staffId: loginId, role: 'staff' });
    } else {
      user = await User.findOne({ enrollmentNo: loginId, role: 'student' });
    }
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user._id, role: user.role, loginId: loginId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        loginId: loginId
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Student Registration
router.post('/register-student', async (req, res) => {
  try {
    console.log(req.body);
    const { name, enrollmentNo, password } = req.body;
    
    const existing = await User.findOne({ enrollmentNo });
    if (existing) {
      return res.status(400).json({ message: 'Enrollment number already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const student = await User.create({
      name,
      enrollmentNo,
      password: hashedPassword,
      role: 'student'
    });
    
    res.status(201).json({ message: 'Student registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;