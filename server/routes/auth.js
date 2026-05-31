import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendOTPEmail } from '../services/emailService.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      fullName, 
      dateOfBirth, 
      gender, 
      mobileNumber, 
      address, 
      pincode, 
      state,
      profilePhoto
    } = req.body;

    console.log('=== SIGNUP REQUEST RECEIVED ===');
    console.log('Email verification is REQUIRED for all signups');

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    // Check if user already exists in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('=== USING EMAIL VERIFICATION FOR ALL SIGNUPS ===');
    
    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP temporarily with all user data
    otpStore.set(email, {
      otp,
      expiry: otpExpiry,
      userData: {
        email,
        password: hashedPassword,
        fullName,
        dateOfBirth,
        gender,
        mobileNumber,
        address,
        pincode,
        state,
        profilePhoto
      }
    });

    console.log('User data stored for OTP verification:', {
      email,
      otp: otp, // Show OTP in console for development
      hasProfilePhoto: !!profilePhoto
    });

    try {
      // Try to send OTP email
      await sendOTPEmail(email, otp, fullName);
      
      console.log('✅ OTP email sent successfully to:', email);
      
      res.json({ 
        message: 'OTP sent to your email',
        email,
        requiresVerification: true
      });
    } catch (emailError) {
      console.error('❌ Failed to send OTP email:', emailError);
      
      // For development: Show OTP in console if email fails
      console.log('🔧 DEVELOPMENT: Email failed, but OTP is stored. Use this OTP:', otp);
      
      res.json({ 
        message: 'OTP generated (check server console for development)',
        email,
        requiresVerification: true,
        developmentNote: 'Email service unavailable - check server console for OTP'
      });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to process signup', details: error.message });
  }
});

// Verify OTP and create user
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const storedData = otpStore.get(email);

    if (!storedData) {
      return res.status(400).json({ error: 'OTP expired or not found' });
    }

    if (Date.now() > storedData.expiry) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Create user in Supabase
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email: storedData.userData.email,
          password: storedData.userData.password,
          full_name: storedData.userData.fullName,
          date_of_birth: storedData.userData.dateOfBirth || null,
          gender: storedData.userData.gender || null,
          mobile_number: storedData.userData.mobileNumber || null,
          address: storedData.userData.address || null,
          pincode: storedData.userData.pincode || null,
          state: storedData.userData.state || null,
          avatar_url: storedData.userData.profilePhoto || null,
          email_verified: true,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Clear OTP
    otpStore.delete(email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Email verified successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role || 'user',
        dateOfBirth: newUser.date_of_birth,
        gender: newUser.gender,
        mobileNumber: newUser.mobile_number,
        address: newUser.address,
        pincode: newUser.pincode,
        state: newUser.state,
        avatar: newUser.avatar_url
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const storedData = otpStore.get(email);

    if (!storedData) {
      return res.status(400).json({ error: 'No pending verification found' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    // Update stored data
    otpStore.set(email, {
      ...storedData,
      otp,
      expiry: otpExpiry
    });

    // Send new OTP email
    await sendOTPEmail(email, otp, storedData.userData.fullName);

    res.json({ message: 'New OTP sent to your email' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

// Test endpoint to check environment and signup logic
router.get('/test-signup-config', (req, res) => {
  const config = {
    emailVerificationMode: 'ALWAYS_REQUIRED',
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Not set',
    SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Not set',
    emailServiceWorking: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    note: 'All signups now require OTP verification. If email fails, OTP will be shown in server console.',
    JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set'
  };
  
  console.log('Test signup config:', config);
  res.json(config);
});

// Test email sending endpoint (for SMTP configuration testing)
router.post('/test-email', async (req, res) => {
  try {
    const { email, testMessage } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Test sending an email
    await sendOTPEmail(email, '123456', 'Test User');
    
    res.json({ 
      success: true,
      message: 'Test email sent successfully',
      email 
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send test email',
      details: error.message 
    });
  }
});

// Test endpoint to check user data
router.get('/test-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found', details: error });
    }

    res.json({
      message: 'User found',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        emailVerified: user.email_verified,
        rawData: user // Include raw data for debugging
      }
    });
  } catch (error) {
    console.error('Test user error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', { email: req.body.email, hasPassword: !!req.body.password });
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user from Supabase
    console.log('Looking up user:', email);
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      console.log('User not found:', error?.message || 'No user data');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('User found:', { id: user.id, email: user.email, verified: user.email_verified });

    // Check if email is verified
    if (!user.email_verified) {
      console.log('Email not verified');
      return res.status(401).json({ error: 'Please verify your email first' });
    }

    // Verify password
    console.log('Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      console.log('Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const responseUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role || 'user',
      dateOfBirth: user.date_of_birth,
      gender: user.gender,
      mobileNumber: user.mobile_number,
      address: user.address,
      pincode: user.pincode,
      state: user.state,
      avatar: user.avatar_url
    };

    console.log('Sending user response:', responseUser); // Debug log

    res.json({
      message: 'Login successful',
      token,
      user: responseUser
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;
