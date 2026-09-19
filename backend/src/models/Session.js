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
    // How many user messages existed when this score was taken.
    // Used to block re-scoring until the user has explained more.
    // null on snapshots saved before this field existed.
    messageCountAtScore: { type: Number, default: null },
    // Which of the session's key points this explanation covered, as
    // 1-based positions in session.keyPoints. Positions rather than the
    // text, so score payloads sent to the browser during the session
    // don't reveal what the key points are.
    coveredKeyPoints: { type: [Number], default: [] },
    // How many key points there were — lets the UI say "3 of 7 covered"
    // without knowing them. null on scores taken without key points.
    keyPointsTotal: { type: Number, default: null },
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
    // ─── SESSION MEMORY ───
    // Only the last 20 messages are sent to the AI student, so long
    // sessions would lose the earlier explanation entirely. These hold
    // a rolling summary of everything said so far, refreshed every few
    // messages (see sessionMemoryService.js).
    summary: {
      type: String,
      default: null,
    },
    // Which of notes.extractedConcepts have actually been taught
    coveredConcepts: {
      type: [String],
      default: [],
    },
    // ─── KEY POINTS ───
    // 5–8 points a complete explanation of this topic should make.
    // Generated at the first score (from the notes when uploaded), then
    // fixed for the session, so completeness is measured against the
    // same yardstick on every rescore. Hidden while the session is
    // active — see the toJSON transform below.
    keyPoints: {
      type: [String],
      default: [],
    },
    // ─── FOCUSED PRACTICE ───
    // Set when the session was started with "Practise this gap". The gap
    // text is snapshotted so the AI student prompt doesn't need a Gap
    // lookup on every message, and still works if the gap is reworded.
    focusGapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gap',
      default: null,
    },
    focusGapText: {
      type: String,
      default: null,
    },
    // messages.length when the summary was last refreshed
    memoryMessageCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    // Who the AI student pretends to be. Changes its vocabulary and the
    // kind of questions it asks, not what it is allowed to know.
    audience: {
      type: String,
      enum: ['child', 'peer', 'interviewer'],
      default: 'peer',
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

// True when the user has said something new since the last score
// (or there is no score yet). Legacy snapshots without
// messageCountAtScore are treated as rescorable.
sessionSchema.methods.hasNewMessagesSinceLastScore = function () {
  const userMessageCount = this.messages.filter((m) => m.role === 'user').length
  const lastScore = this.scores[this.scores.length - 1]
  if (!lastScore || lastScore.messageCountAtScore == null) return true
  return userMessageCount > lastScore.messageCountAtScore
}

// Virtual: quick boolean — does this session have uploaded notes?
sessionSchema.virtual('hasNotes').get(function () {
  return !!(this.notes && this.notes.extractedConcepts.length > 0)
})

sessionSchema.set('toJSON', {
  virtuals: true,
  // Key points are the answer key for completeness — never send them
  // to the browser while the session is still being taught
  transform: (doc, ret) => {
    if (ret.status === 'active') delete ret.keyPoints
    return ret
  },
})

const Session = mongoose.model('Session', sessionSchema)

export default Session