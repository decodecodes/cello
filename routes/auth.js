const express = require('express')
const passport = require('passport')
const jwt = require('jsonwebtoken')
const UsersModel = require("../model/users")
const nodemailer = require('nodemailer')
const crypto = require('crypto')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendResetEmail = async (email) => {
  try {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetLink = `https://yourapp.com/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>We've received a request to reset the password for your account.</p>
        <p>If you made this request, please click the link below to set a new password:</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetLink}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>If you didn't request a password reset, you can safely ignore this email—no changes will be made to your account.</p>
        
        <br>
        <p>Sincerely,<br>
        Cello team.</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request - Cello',
      html: html
    };

    await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      resetToken: resetToken
    };
    
  } catch (error) {
    console.error('Error sending reset email:', error);
    return {
      success: false,
      message: 'Failed to send reset email',
      error: error.message
    };
  }
};

const handleForgotPassword = async (email) => {
  try {
    const emailResult = await sendResetEmail(email);
    
    if (!emailResult.success) {
      return emailResult;
    }
    
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    
    await UsersModel.findOneAndUpdate(
      { email: email },
      { 
        resetToken: emailResult.resetToken,
        resetTokenExpiry: tokenExpiry
      }
    );
    
    return {
      success: true,
      message: 'Password reset email sent successfully'
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Failed to process forgot password request',
      error: error.message
    };
  }
};

//NEEDED FOR EMAIL VERIFICATION
const generateVerificationCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const sendVerificationEmail = async (email, verificationCode) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to Cello!</h2>
        <p>Hello,</p>
        <p>Thank you for signing up with Cello. To complete your registration, please verify your email address.</p>
        <p>Enter the verification code below in the app:</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <div style="background-color: #f8f9fa; border: 2px dashed #007bff; padding: 20px; 
                      border-radius: 8px; display: inline-block;">
            <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 8px; font-family: monospace;">
              ${verificationCode}
            </h1>
          </div>
        </div>
        
        <p><strong>This code will expire in 15 minutes.</strong></p>
        
        <p>If you didn't create an account with Cello, you can safely ignore this email.</p>
        
        <br>
        <p>Welcome aboard!<br>
        Cello team.</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your verification code - Cello',
      html: html
    };

    await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      message: 'Verification email sent successfully'
    };
    
  } catch (error) {
    console.error('Error sending verification email:', error);
    return {
      success: false,
      message: 'Failed to send verification email',
      error: error.message
    };
  }
};

const handleEmailVerification = async (email) => {
  try {
    const verificationCode = generateVerificationCode();
    const codeExpiry = new Date(Date.now() + 15 * 60000); // 15 minutes
    
    
    await UsersModel.findOneAndUpdate(
      { email: email },
      { 
        verificationCode: verificationCode,
        verificationCodeExpiry: codeExpiry,
        isEmailVerified: false
      }
    );
    
    const emailResult = await sendVerificationEmail(email, verificationCode);
    
    return emailResult;
    
  } catch (error) {
    return {
      success: false,
      message: 'Failed to process email verification',
      error: error.message
    };
  }
};

const handleOAuthSuccess = async (req, res) => {
  try {
    const body = { _id: req.user._id, email: req.user.email };
    const token = jwt.sign({ user: body }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Redirect to your frontend with token
    // You can customize this redirect URL based on your frontend setup
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  } catch (error) {
    res.redirect(`${process.env.CLIENT_URL}/auth/error`);
  }}

require('dotenv').config()

const authRouter = express.Router()


//ALL APIS FOR AUTHENTICATION BEGIN HERE
authRouter.post(
    '/signup',
    passport.authenticate('signup', { session: false }), 
    async (req, res, next) => {
        try {
            const verificationResult = await handleEmailVerification(req.user.email);
            
            if (verificationResult.success) {
                res.json({
                    message: "Sign up successful! Please check your email for a verification code.",
                    user: req.user,
                    emailSent: true
                });
            } else {
                res.json({
                    message: "Sign up successful, but failed to send verification code. You can request a new verification code.",
                    user: req.user,
                    emailSent: false
                });
            }
        } catch (error) {
            res.status(500).json({
                message: "Sign up successful, but error occurred during email verification process",
                user: req.user,
                error: error.message
            });
        }
    }
)

authRouter.post(
    '/login',
    async (req, res, next) => { 
        passport.authenticate('login', async (err, user, info) => {
            try {
                if (err) {
                    return next(err)
                }
                if (!user) {
                    const error = new Error('Username or password is incorrect')
                    return next(error)
                }

                req.login(user, { session: false},
                    async (error) => {
                        if (error) return next(error);

                        const body = { _id: user._id, email: user.email };
                        const token = jwt.sign({ user: body }, process.env.JWT_SECRET, { expiresIn: '1h' });

                        return res.json({ token });

                    }
                );
            } catch (error) { 
                return next(error)
            }
        })(req, res, next)
    }
)

authRouter.post('/oauth/mobile/google', async (req, res) => {
    try {
        const { idToken } = req.body;
        
        // Verify the Google ID token
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;
        
        // Find or create user
        let user = await UsersModel.findOne({ 
            $or: [
                { googleId: googleId },
                { email: email }
            ]
        });
        
        if (!user) {
            user = new UsersModel({
                email: email,
                name: name,
                googleId: googleId,
                profilePicture: picture,
                isEmailVerified: true, // Google emails are pre-verified
                provider: 'google'
            });
            await user.save();
        } else if (!user.googleId) {
            // Link existing account with Google
            user.googleId = googleId;
            user.profilePicture = picture || user.profilePicture;
            user.isEmailVerified = true;
            await user.save();
        }
        
        const body = { _id: user._id, email: user.email };
        const token = jwt.sign({ user: body }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        res.json({
            message: "Google authentication successful",
            token: token,
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                profilePicture: user.profilePicture
            }
        });
        
    } catch (error) {
        res.status(401).json({
            message: "Google authentication failed",
            error: error.message
        });
    }
})

authRouter.post('/oauth/mobile/apple', async (req, res) => {
    try {
        const { identityToken, authorizationCode } = req.body;
        
        // Verify Apple identity token
        const jwt = require('jsonwebtoken');
        const jwksClient = require('jwks-rsa');
        
        const client = jwksClient({
            jwksUri: 'https://appleid.apple.com/auth/keys'
        });
        
        function getKey(header, callback) {
            client.getSigningKey(header.kid, (err, key) => {
                const signingKey = key.publicKey || key.rsaPublicKey;
                callback(null, signingKey);
            });
        }
        
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(identityToken, getKey, {
                audience: process.env.APPLE_CLIENT_ID,
                issuer: 'https://appleid.apple.com'
            }, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
            });
        });
        
        const { sub: appleId, email } = decoded;
        
        // Find or create user
        let user = await UsersModel.findOne({ 
            $or: [
                { appleId: appleId },
                { email: email }
            ]
        });
        
        if (!user) {
            user = new UsersModel({
                email: email,
                appleId: appleId,
                isEmailVerified: true, // Apple emails are pre-verified
                provider: 'apple'
            });
            await user.save();
        } else if (!user.appleId) {
            // Link existing account with Apple
            user.appleId = appleId;
            user.isEmailVerified = true;
            await user.save();
        }
        
        const body = { _id: user._id, email: user.email };
        const token = jwt.sign({ user: body }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        res.json({
            message: "Apple authentication successful",
            token: token,
            user: {
                _id: user._id,
                email: user.email,
                appleId: user.appleId
            }
        });
        
    } catch (error) {
        res.status(401).json({
            message: "Apple authentication failed",
            error: error.message
        });
    }
});



authRouter.post(
    '/resetPassword', 
    async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        
        const user = await UsersModel.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({
                message: "Invalid or expired reset token"
            });
        }
        
        user.password = newPassword;
        
        // Clear reset token
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        
        // Save - validation runs here on the raw password
        await user.save();
        
        res.json({
            message: "Password Reset Successful"
        });
        
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: "Password validation failed",
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        res.status(500).json({
            message: "Error resetting password",
            error: error.message
        });
    }
});


authRouter.post(
    '/forgotPassword', 
    async (req, res) => {
    try {
    const { email } = req.body;
    
    const user = await UsersModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: 'No account found with that email address'
      });
    }

     if (user.provider && user.provider !== 'local') {
      return res.status(400).json({
        message: `This account was created with ${user.provider}. Please sign in using ${user.provider} instead.`
      });
    }
    
    const result = await handleForgotPassword(email);
    if (result.success) {
      res.json({
        message: 'Password reset email sent successfully'
      });
    } else {
      res.status(500).json({
        message: result.message,
        error: result.error
      });
    }
    
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});




authRouter.post(
    '/verifyEmail', 
    async (req, res) => {
    try {
    const { code, email } = req.body;
    if (!code || !email) {
      return res.status(400).json({
        message: "Email and verification code are required"
      });
    }
    
    const user = await UsersModel.findOne({
      email: email,
      verificationCode: code.toUpperCase(),
      verificationCodeExpiry: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification code"
      });
    }
    
    user.isEmailVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpiry = undefined;
    
    await user.save();
    
    res.json({
      message: "Email verified successfully"
    });
    
  } catch (error) {
    res.status(500).json({
      message: "Error verifying email",
      error: error.message
    });
  }
})

module.exports = authRouter