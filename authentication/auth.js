const passport = require('passport')
const localStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const UserModel = require('../model/users');

const JWTstrategy = require('passport-jwt').Strategy
const ExtractJWT = require('passport-jwt').ExtractJwt

passport.use(
    new JWTstrategy(
        {
            secretOrKey: process.env.JWT_SECRET,
            jwtFromRequest: ExtractJWT.fromUrlQueryParameter('secret_token')
        },
        async (token, done) => {
            try {
                return done(null, token.user)
            } catch (error) {
                done(error);
            }
        }
    )
);

passport.use(
    'signup',
    new localStrategy(
        {
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true
        },
        async (req, email, password, done) => {
    try {
        const { confirmPassword } = req.body;
        
        if (password !== confirmPassword) {
            return done(null, false, { message: 'Passwords do not match' });
        }
        
        // Create user (your existing logic)
        const user = await UserModel.create({ email, password });
        return done(null, user);
        
    } catch (error) {
        return done(error);
    }
}));
      

passport.use(
    'login',
    new localStrategy(
        {
            usernameField: 'email',
            passwordField: 'password'
        },
        async (email, password, done) => {
            try {
                const user = await UserModel.findOne({ email });

                if (!user) {
                    return done(null, false, {message: 'User not found'});
                }

                const validate = await user.isValidPassword(password);

                if (!validate) {
                    return done(null, false, {message: 'Wrong Password'})
                }

                return done(null, user, { message: 'Logged in Successfully'});
            } catch (error) {
                return done(error)
            }
        }
    )
)

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const userProfile = {
            id: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            picture: profile.photos[0]?.value
        };
        
        const { user, isNew } = await UserModel.findOrCreateOAuthUser(userProfile, 'google');
        
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}))

passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKeyString: process.env.APPLE_PRIVATE_KEY,
    callbackURL: process.env.APPLE_CALLBACK_URL || '/auth/apple/callback'
}, async (accessToken, refreshToken, idToken, profile, done) => {
    try {
        const userProfile = {
            id: profile.id,
            email: profile.email,
            name: profile.name?.firstName && profile.name?.lastName 
                ? `${profile.name.firstName} ${profile.name.lastName}`
                : profile.email.split('@')[0],
            picture: null
        };
        
        const { user, isNew } = await UserModel.findOrCreateOAuthUser(userProfile, 'apple');
        
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

module.exports = passport;