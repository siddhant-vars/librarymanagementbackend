import User from '../models/user.js'; // Ensure correct case-sensitivity
import Book from '../models/books.js';
import Issue from '../models/issue.js';

// 1. Get Library Overview (Stats for Admin Dashboard)
export const getLibraryStats = async (req, res) => {
    try {
        const staffCount = await User.countDocuments({ role: 'staff' });
        const studentCount = await User.countDocuments({ role: 'student' });
        const totalBooks = await Book.countDocuments();
        const issuedBooksCount = await Book.countDocuments({ status: 'Issued' });

        res.status(200).json({
            staffCount,
            studentCount,
            totalBooks,
            issuedBooksCount
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching stats", error: error.message });
    }
};

// 2. Add New Staff (Admin Only Action)
export const addStaff = async (req, res) => {
    const { name, staffId, password, email } = req.body;
    try {
        // Check if staffId already exists
        const staffExists = await User.findOne({ staffId });
        if (staffExists) return res.status(400).json({ message: "Staff ID already exists" });

        const newStaff = await User.create({
            name,
            staffId,
            email, // Optional: add email for staff if needed
            password,
            role: 'staff'
        });

        res.status(201).json({ message: "Staff added successfully", newStaff });
    } catch (error) {
        res.status(500).json({ message: "Error adding staff", error: error.message });
    }
};

// 3. Remove Staff
export const removeStaff = async (req, res) => {
    try {
        const staff = await User.findById(req.params.id);
        if (!staff || staff.role !== 'staff') {
            return res.status(404).json({ message: "Staff member not found" });
        }
        
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Staff removed successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error removing staff", error: error.message });
    }
};

// 4. Get All Staff List
export const getAllStaff = async (req, res) => {
    try {
        const staffList = await User.find({ role: 'staff' }).select('-password');
        res.status(200).json(staffList);
    } catch (error) {
        res.status(500).json({ message: "Error fetching staff list", error: error.message });
    }
};

// 5. Global Settings: Set Fine Price and Last Date (Standard Return Duration)
// Note: For a lab, we can store this in a simple "Settings" collection or use a hardcoded value.
// Here is a way to see who has books and their current status
export const getIssuedReports = async (req, res) => {
    try {
        const reports = await Issue.find()
            .populate('book', 'title')
            .populate('student', 'name enrollmentNo')
            .sort({ createdAt: -1 }); // Newest issues first
            
        res.status(200).json(reports);
    } catch (error) {
        res.status(500).json({ message: "Error fetching reports", error: error.message });
    }
};