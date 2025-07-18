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
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    verificationCode: {
        type: String
    },
    verificationCodeExpiry:{

    }
    
})

        


UserSchema.pre(
    'save',
    async function (next) {
        const user = this;
        const hash = await bcrypt.hash(this.password, 10)

        this.password = hash;
        next();
    }
);

UserSchema.methods.isValidPassword = async function(password) {
    const user = this;
    const compare = await bcrypt.compare(password, user.password);

    return compare;
}

const UserModel = mongoose.model('users', UserSchema);

module.exports  = UserModel;



