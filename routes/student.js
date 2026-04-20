const express = require('express');
const Book = require('../models/Book');
const IssuedBook = require('../models/IssuedBook');
const BookRequest = require('../models/BookRequest');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('student'));

// Get available books
router.get('/available-books', async (req, res) => {
  try {
    const books = await Book.find({ availableCopies: { $gt: 0 } });
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my issued books
router.get('/my-issued-books', async (req, res) => {
  try {
    const issued = await IssuedBook.find({ 
      studentId: req.user.userId,
      returned: false
    }).populate('bookId');
    res.json(issued);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my total fine
router.get('/my-fine', async (req, res) => {
  try {
    const result = await IssuedBook.aggregate([
      { $match: { studentId: req.user.userId, returned: true } },
      { $group: { _id: null, totalFine: { $sum: '$fine' } } }
    ]);
    const totalFine = result.length > 0 ? result[0].totalFine : 0;
    res.json({ totalFine });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Request book
router.post('/request-book', async (req, res) => {
  try {
    const { bookId } = req.body;
    
    const book = await Book.findById(bookId);
    if (!book || book.availableCopies <= 0) {
      return res.status(400).json({ message: 'Book not available' });
    }
    
    const existingRequest = await BookRequest.findOne({
      bookId,
      studentId: req.user.userId,
      status: 'pending'
    });
    
    if (existingRequest) {
      return res.status(400).json({ message: 'Request already pending' });
    }
    
    const request = await BookRequest.create({
      bookId,
      studentId: req.user.userId
    });
    
    res.json({ message: 'Book request submitted successfully', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;