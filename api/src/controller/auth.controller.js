import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import OTP from '../models/otp.model.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Utility function to send OTP email
const sendOTPEmail = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'zoila48@ethereal.email',
            pass: 'Ek2jYerjSvqUGyN2wF'
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}. It is valid for 5 minutes.`,
    };

    await transporter.sendMail(mailOptions);
};

// Generate a 6-digit numeric OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a number between 100000 and 999999
};

// Register and send OTP
export const registerUser = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required', status: false });
    }

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists', status: false });
        }

        const otp = generateOTP();
        await OTP.create({ email, otp });
        await sendOTPEmail(email, otp);

        return res.status(200).json({ message: 'OTP sent successfully', status: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', status: false });
    }
};

// Verify OTP and create user
export const verifyOTP = async (req, res) => {
    const { email, otp, password, userName } = req.body;

    if (!email || !otp || !password || !userName) {
        return res.status(400).json({ message: 'Email, OTP, password, and userName are required', status: false });
    }

    try {
        // Check if the OTP is valid
        const otpRecord = await OTP.findOne({ email, otp });

        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired OTP', status: false });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user
        const user = await User.create({ email, password: hashedPassword, userName });

        // Clean up OTPs for this email
        await OTP.deleteMany({ email });

        // Generate JWT token
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET environment variable is not set.');
            return res.status(500).json({ message: 'Internal server error', status: false });
        }
        
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });
        
        return res.status(201).json({ message: 'User created successfully', status: true, token, data: user });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', status: false });
    }
};


// Login user
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required', status: false });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password', status: false });
        }

        // Compare the password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password', status: false });
        }

        // Generate JWT token
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET environment variable is not set.');
            return res.status(500).json({ message: 'Internal server error', status: false });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        return res.status(200).json({ message: 'Login successful', status: true, token, data: user });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error', status: false });
    }
};

// Session check endpoint
export const checkSession = (req, res) => {
    const token = req.cookies.access_token;
  
    if (!token) {
      return res.status(200).json({ status: false });
    }
  
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(200).json({ status: false });
      }
  
      return res.status(200).json({ status: true, user });
    });
  };
  

// Sign out user
export const signOut = (req, res) => {
    res.clearCookie('access_token');
    res.status(200).json({ message: 'Sign out successful', status: true });
};
