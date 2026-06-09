import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
)

// Each time user requests scoring, a new snapshot is added
const scoreSnapshotSchema = new mongoose.Schema(
  {
    accuracy: { type: Number, min: 0, max: 10 },
    clarity: { type: Number, min: 0, max: 10 },
    completeness: { type: Number, min: 0, max: 10 },
    gaps: { type: [String], default: [] },
    feedback: { type: String, default: null },
    scoredAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
      minlength: [2, 'Topic must be at least 2 characters'],
      maxlength: [200, 'Topic cannot exceed 200 characters'],
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    // Array of score snapshots — one added each time user requests scoring
    scores: {
      type: [scoreSnapshotSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      // removed abandoned — sessions stay active until user explicitly ends them
      default: 'active',
    },
    mode: {
      type: String,
      enum: ['text', 'voice'],
      default: 'text',
    },
    duration: {
      type: Number,
      default: null,
      // calculated in seconds when session is ended
    },
  },
  { timestamps: true }
)

// Virtual — gets the most recent score snapshot
// Virtuals are computed properties that don't get stored in DB
// Access it like: session.latestScore
sessionSchema.virtual('latestScore').get(function () {
  if (this.scores.length === 0) return null
  return this.scores[this.scores.length - 1]
})

// Make virtuals show up in JSON responses
sessionSchema.set('toJSON', { virtuals: true })

const Session = mongoose.model('Session', sessionSchema)

export default Session