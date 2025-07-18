const mongoose = require('mongoose');
const bcrypt = require('bcrypt')

const Schema = mongoose.Schema

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true

    },
    password: {
        type: String,
        minlength: [8, 'Password must contain more than 8 characters'],
        required: true,
        required: function() {
        return !this.isOAuthUser; // Only required for non-OAuth users
            },
        validate: {
            validator: function(password) {
                if (!/[A-Z]/.test(password)) {
                    return false;
                }
                if (!/[0-9]/.test(password)) {
                    return false;
                }
                if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
                    return false;
                }
                return true;
            },
            message: 'Password must contain at least 1 capital letter, 1 number, and 1 special character'
        }
    },
   name: {
    type: String,
    required: function() {
      // Name is required only for OAuth users (Google/Apple provide it)
      return this.isOAuthUser;
    }
  },
  profilePicture: { //
    type: String,
    default: null
  },
  // OAuth provider fields
  googleId: {
    type: String,
    sparse: true
  },
  appleId: {
    type: String,
    sparse: true
  },
  signupMethod: {
    type: String,
    enum: ['manual', 'google', 'apple'],
    default: 'manual'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String
  },
  verificationCodeExpiry: {
    type: Date
  },
  // OAuth users are considered verified
  isOAuthUser: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,

  resetToken: {
    type: String
},
resetTokenExpiry: {
    type: Date
}
    
})

        


UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

UserSchema.methods.isValidPassword = async function(password) {
    const user = this;
    const compare = await bcrypt.compare(password, user.password);

    return compare;
}

// Static method to find or create OAuth user
UserSchema.statics.findOrCreateOAuthUser = async function(profile, provider) {
  try {
    const providerId = provider === 'google' ? 'googleId' : 'appleId';
    
    // First try to find user by provider ID
    let user = await this.findOne({ [providerId]: profile.id });
    
    if (user) {
      return { user, isNew: false };
    }
    
    // If not found, check if user exists with same email
    user = await this.findOne({ email: profile.email });
    
    if (user) {
      // Link existing account with OAuth provider
      user[providerId] = profile.id;
      user.isOAuthUser = true;
      user.isEmailVerified = true;
      if (!user.profilePicture && profile.picture) {
        user.profilePicture = profile.picture;
      }
      await user.save();
      return { user, isNew: false };
    }
    
    // Create new user
    user = new this({
      email: profile.email,
      name: profile.name,
      profilePicture: profile.picture || null,
      [providerId]: profile.id,
      signupMethod: provider,
      isOAuthUser: true,
      isEmailVerified: true
    });
    
    await user.save();
    return { user, isNew: true };
    
  } catch (error) {
    throw new Error(`OAuth user creation failed: ${error.message}`);
  }
};


const UserModel = mongoose.model('users', UserSchema);

module.exports  = UserModel;



