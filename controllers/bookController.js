import Book from '../models/books.js';
import Issue from '../models/issue.js';
import User from '../models/user.js';

// 1. Add a New Book (Staff/Admin Only)
export const addBook = async (req, res) => {
    try {
        const { title, author, isbn, category } = req.body;
        const newBook = await Book.create({ title, author, isbn, category });
        res.status(201).json({ message: "Book added successfully", newBook });
    } catch (error) {
        res.status(500).json({ message: "Error adding book", error: error.message });
    }
};

// 2. Delete a Book (Staff/Admin Only)
export const deleteBook = async (req, res) => {
    try {
        await Book.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Book deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting book", error: error.message });
    }
};

// 3. Issue a Book (Staff Action)
export const issueBook = async (req, res) => {
    const { bookId, enrollmentNo, returnDate } = req.body;

    try {
        const student = await User.findOne({ enrollmentNo, role: 'student' });
        if (!student) return res.status(404).json({ message: "Student not found" });

        const book = await Book.findById(bookId);
        if (!book || book.status === 'Issued') {
            return res.status(400).json({ message: "Book is already issued" });
        }

        const newIssue = await Issue.create({
            book: bookId,
            student: student._id,
            issuedBy: req.user.id,
            returnDate: new Date(returnDate)
        });

        // 1. Update Book Status
        book.status = 'Issued';
        book.issuedTo = student._id;
        await book.save();

        // 2. 🔥 ADD THIS LINE: Update the Student's issuedBooks array
        await User.findByIdAndUpdate(student._id, {
            $push: { issuedBooks: bookId }
        });

        res.status(200).json({ message: "Book issued successfully", newIssue });
    } catch (error) {
        res.status(500).json({ message: "Error issuing book", error: error.message });
    }
};

// 4. Get Student's Issued Books (Student Dashboard)
export const getMyBooks = async (req, res) => {
    try {
        // 1. Fetch all 'Issued' records for this specific student
        const issues = await Issue.find({ 
            student: req.user.id, 
            status: 'Issued' 
        }).populate('book');

        const fineRate = 10; 
        const today = new Date();

        // 2. Map through each 'issue' record to calculate the fine
        const issuesWithFines = issues.map(issue => {
            // Convert the Mongoose document to a plain object so we can edit it
            const issueObj = issue.toObject();

            if (today > issue.returnDate) {
                const diffTime = Math.abs(today - issue.returnDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                issueObj.fineAmount = diffDays * fineRate;
                issueObj.status = 'Overdue'; // Update status visually
            } else {
                issueObj.fineAmount = 0;
            }

            return issueObj;
        });

        // 3. Send the updated list back to the React frontend
        res.status(200).json(issuesWithFines);
    } catch (error) {
        res.status(500).json({ message: "Error calculating fines", error: error.message });
    }
};

// 5. Get All Available Books (Student/Staff view)
export const getAllBooks = async (req, res) => {
    try {
        const books = await Book.find();
        res.status(200).json(books);
    } catch (error) {
        res.status(500).json({ message: "Error fetching books", error: error.message });
    }
};