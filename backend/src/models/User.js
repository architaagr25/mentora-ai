import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 6,
    },
    refreshTokens: {
      type: [String],
      default: [],
    },
   xp: {
      type: Number,
      default: 0,
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastActiveDate: {
      type: Date,
      default: null,
    },
    // Stores only badge IDs (see backend/src/constants/badges.js for
    // the full definitions) — never full badge objects, so badge
    // copy/criteria can change later without a data migration.
    badges: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
)

// Instance method — called on a single user document
// usage: await user.comparePassword('plaintext')
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash)
}

// Never expose passwordHash or refreshTokens in API responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.passwordHash
  delete obj.refreshTokens
  return obj
}

const User = mongoose.model('User', userSchema)

export default User