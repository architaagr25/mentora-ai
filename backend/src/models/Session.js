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

// Notes uploaded by the user for this session.
// rawText is cleared when the session ends to save space.
// extractedConcepts stay permanently for reference.
const notesSchema = new mongoose.Schema(
  {
    extractedConcepts: {
      type: [String],
      default: [],
    },
    rawText: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: null,
    },
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
    scores: {
      type: [scoreSnapshotSchema],
      default: [],
    },
    // null means no notes uploaded for this session
    notes: {
      type: notesSchema,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
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
    },
  },
  { timestamps: true }
)

// Virtual: returns the most recent score snapshot
sessionSchema.virtual('latestScore').get(function () {
  if (this.scores.length === 0) return null
  return this.scores[this.scores.length - 1]
})

// Virtual: quick boolean — does this session have uploaded notes?
sessionSchema.virtual('hasNotes').get(function () {
  return !!(this.notes && this.notes.extractedConcepts.length > 0)
})

sessionSchema.set('toJSON', { virtuals: true })

const Session = mongoose.model('Session', sessionSchema)

export default Session