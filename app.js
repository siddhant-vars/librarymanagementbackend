import express from 'express';
import cors from 'cors'; // Good for connecting React to Express
import authRoutes from './routes/authroutes.js';
import bookRoutes from './routes/bookroutes.js';
import adminRoutes from './routes/adminroutes.js';

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Allows your React frontend to talk to this API

// Route Links
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/admin', adminRoutes);

// Base route for testing
app.get('/', (req, res) => {
    res.send('Library System API is running...');
});

export default app;