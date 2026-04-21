const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors(
    {
  origin: ['http://localhost:3000', 'https://librarymanagementfrontend-lac.vercel.app'],
  credentials: true,
}
));
app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ message: 'CORS working' });
});

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const staffRoutes = require('./routes/staff');
const studentRoutes = require('./routes/student');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/student', studentRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Initialize default settings and admin
    initializeDatabase();
  })
  .catch(err => console.error('MongoDB connection error:', err));

async function initializeDatabase() {
  const Setting = require('./models/Setting');
  const User = require('./models/User');
  const bcrypt = require('bcryptjs');

  // Initialize default settings
  const settings = await Setting.findOne();
  if (!settings) {
    await Setting.create({
      finePerDay: 5,
      returnPeriodDays: 14
    });
    console.log('Default settings created');
  }

  // Initialize default admin
  const adminExists = await User.findOne({ role: 'admin', email: 'admin@library.com' });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      email: 'admin@library.com',
      password: hashedPassword,
      role: 'admin',
      name: 'Administrator'
    });
    console.log('Default admin created: admin@library.com / admin123');
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});