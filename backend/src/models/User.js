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
    // Password reset support. Stores a SHA-256 hash of the reset
    // token — never the token itself — so that even a full database
    // leak wouldn't hand out working reset links; the actual token
    // only ever exists in the emailed URL, never in the DB. (bcrypt
    // isn't used here on purpose: it's designed to be slow for
    // low-entropy inputs like passwords — this token is already a
    // high-entropy random value, so a fast hash is the correct tool.)
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
      // select: false means this never comes back in a normal query
      // (e.g. .find(), req.user from auth middleware) unless
      // explicitly requested via .select('+resetPasswordToken') —
      // same reasoning as why passwordHash isn't exposed by default.
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
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

// Never expose passwordHash, refreshTokens, or reset-token internals
// in API responses. select: false on the schema already prevents
// these from being fetched by default, but toJSON() strips them
// explicitly too, in case a future query ever does select them in.
userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.passwordHash
  delete obj.refreshTokens
  delete obj.resetPasswordToken
  delete obj.resetPasswordExpires
  return obj
}
const User = mongoose.model('User', userSchema)

export default User