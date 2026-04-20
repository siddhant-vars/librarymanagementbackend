import User from '../models/user.js';
import jwt from 'jsonwebtoken';

// Helper to create JWT Token
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', {
        expiresIn: '1d'
    });
};

export const loginUser = async (req, res) => {
    const { role, password, enrollmentNo, staffId, email } = req.body;

    try {
        let user;

        // 1. Logic to find user based on Role
        // Change this logic to be more flexible
        if (role === 'student') {
            user = await User.findOne({ enrollmentNo, role: 'student' });
        } else if (role === 'staff') {
            // Look for staffId OR enrollmentNo just in case you mix them up
            user = await User.findOne({ 
                $or: [{ staffId: staffId || enrollmentNo }, { enrollmentNo: staffId || enrollmentNo }], 
                role: 'staff' 
            });
        } else if (role === 'admin') {
            user = await User.findOne({ email, role: 'admin' });
        }

        // 2. Validate User Existence
        if (!user) {
            return res.status(404).json({ message: "User not found for this role" });
        }

        // 3. Check Password (Note: In a real app, use bcrypt.compare)
        if (user.password !== password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 4. Generate Token
        const token = createToken(user._id);

        // 5. Send Response with Role (Frontend uses this to redirect)
        res.status(200).json({
            message: "Login successful",
            token,
            role: user.role,
            userName: user.name
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

export const registerUser = async (req, res) => {
    const { name, password, role, enrollmentNo, staffId, email } = req.body;

    try {
        // --- SECURITY CHECK ---
        // Students should not be able to create Staff or Admin accounts
        if (role === 'staff' || role === 'admin') {
            return res.status(403).json({ 
                message: "Only an Admin can create Staff or Admin accounts. Please use the Admin Dashboard." 
            });
        }

        // 1. Build a dynamic search query (Check for existing Student)
        let queryConditions = [];
        if (enrollmentNo) queryConditions.push({ enrollmentNo });

        if (queryConditions.length > 0) {
            const existingUser = await User.findOne({ $or: queryConditions });
            if (existingUser) {
                return res.status(400).json({ message: "Student with this Enrollment No already exists" });
            }
        }

        // 2. Create the Student
        const newUser = await User.create({
            name,
            password,
            role: 'student', // Force role to student for self-registration
            enrollmentNo
        });

        res.status(201).json({ message: "Student registered successfully", user: newUser });
    } catch (error) {
        res.status(500).json({ message: "Registration failed", error: error.message });
    }
};