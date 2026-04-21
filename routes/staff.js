const express = require('express');
const Book = require('../models/Book');
const User = require('../models/User');
const IssuedBook = require('../models/IssuedBook');
const BookRequest = require('../models/BookRequest');
const Setting = require('../models/Setting');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('staff'));

// Add book
router.post('/add-book', async (req, res) => {
  try {
    const { title, author, isbn, totalCopies } = req.body;
    
    const existing = await Book.findOne({ isbn });
    if (existing) {
      return res.status(400).json({ message: 'Book with this ISBN already exists' });
    }
    
    const book = await Book.create({
      title,
      author,
      isbn,
      totalCopies,
      availableCopies: totalCopies,
      addedBy: req.user.userId
    });
    
    res.json({ message: 'Book added successfully', book });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete book
router.delete('/delete-book/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    const issuedCount = await IssuedBook.countDocuments({ bookId: req.params.id, returned: false });
    if (issuedCount > 0) {
      return res.status(400).json({ message: 'Cannot delete book with issued copies' });
    }
    
    await book.deleteOne();
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all books
router.get('/books', async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Issue book to student
router.post('/issue-book', async (req, res) => {
  try {
    const { enrollmentNo, bookId } = req.body;
    
    const student = await User.findOne({ enrollmentNo, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const book = await Book.findById(bookId);
    if (!book || book.availableCopies <= 0) {
      return res.status(400).json({ message: 'Book not available' });
    }

    const alreadyIssued = await IssuedBook.findOne({
      bookId,
      studentId: student._id,
      returned: false
    });

    if(alreadyIssued) {
      return res.status(400).json({message : 'Book already issued'});
    }
    
    const settings = await Setting.findOne();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + settings.returnPeriodDays);
    
    const issuedBook = await IssuedBook.create({
      bookId: book._id,
      studentId: student._id,
      dueDate
    });
    
    book.availableCopies -= 1;
    await book.save();
    
    // If this was from a request, update request status
    await BookRequest.findOneAndUpdate(
      { bookId: book._id, studentId: student._id, status: 'pending' },
      { status: 'approved' }
    );
    
    res.json({ message: 'Book issued successfully', issuedBook });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Return book
router.post('/return-book/:issueId', async (req, res) => {
  try {
    const issue = await IssuedBook.findById(req.params.issueId);
    if (!issue || issue.returned) {
      return res.status(404).json({ message: 'Issue record not found' });
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
    
    const book = await Book.findById(issue.bookId);
    book.availableCopies += 1;
    await book.save();
    
    res.json({ message: 'Book returned successfully', fine });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all issued books
router.get('/issued-books', async (req, res) => {
  try {
    const issued = await IssuedBook.find({ returned: false })
      .populate('bookId')
      .populate('studentId', 'name enrollmentNo');
    res.json(issued);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get book requests
router.get('/requests', async (req, res) => {
  try {
    const requests = await BookRequest.find({ status: 'pending' })
      .populate('bookId')
      .populate('studentId', 'name enrollmentNo');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Search students
router.get('/search-student', async (req, res) => {
  try {
    const { q } = req.query;
    const students = await User.find({
      role: 'student',
      $or: [
        { enrollmentNo: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ]
    }).select('name enrollmentNo');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;