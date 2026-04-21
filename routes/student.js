const express = require('express');
const Book = require('../models/Book');
const IssuedBook = require('../models/IssuedBook');
const BookRequest = require('../models/BookRequest');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const Setting = require('../models/Setting');

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

// Return a book (student self-return)
router.post('/return-book/:issueId', async (req, res) => {
  try {
    const issue = await IssuedBook.findById(req.params.issueId);
    if (!issue) {
      return res.status(404).json({ message: 'Issue record not found' });
    }
    // Ensure the book belongs to this student
    if (issue.studentId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You can only return your own books' });
    }
    if (issue.returned) {
      return res.status(400).json({ message: 'Book already returned' });
    }

    const settings = await Setting.findOne();
    const returnDate = new Date();
    let fine = 0;
    if (returnDate > issue.dueDate) {
      const daysLate = Math.ceil((returnDate - issue.dueDate) / (1000 * 60 * 60 * 24));
      fine = daysLate * settings.finePerDay;
    }

    issue.returnDate = returnDate;
    issue.fine = fine;
    issue.returned = true;
    await issue.save();

    // Increase available copies
    await Book.findByIdAndUpdate(issue.bookId, { $inc: { availableCopies: 1 } });

    res.json({ message: 'Book returned successfully', fine });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Search available books (by title or author)
router.get('/search-books', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      // If no search term, return all available books
      const books = await Book.find({ availableCopies: { $gt: 0 } });
      return res.json(books);
    }
    
    // Case-insensitive search on title or author
    const searchRegex = new RegExp(q, 'i');
    const books = await Book.find({
      availableCopies: { $gt: 0 },
      $or: [
        { title: searchRegex },
        { author: searchRegex }
      ]
    });
    
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;