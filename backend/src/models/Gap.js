// backend/src/models/Gap.js
import mongoose from 'mongoose'

// ─────────────────────────────────────────
// GAP
// One knowledge gap the scoring AI found in a user's explanation of a
// topic. Gaps used to be read straight off every score attempt, so a
// gap stayed on the Concepts page forever — even after the user fixed
// it on a rescore. Storing them lets a gap be open or resolved.
//
// One document per (user, topic, gap text): the same gap found again
// in a later score updates the existing document instead of adding a
// duplicate. See gapService.js for how gaps are written.
// ─────────────────────────────────────────
const gapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Topic as the user most recently typed it — shown on the page
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    // Normalised topic (trimmed, lowercase, single spaces) — groups
    // "TCP Handshake" and "tcp  handshake" together
    topicKey: {
      type: String,
      required: true,
    },
    // Gap sentence as the scorer most recently worded it
    text: {
      type: String,
      required: true,
      trim: true,
    },
    // Normalised text — what makes two gaps "the same gap"
    textKey: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
    },
    // The session whose latest score most recently contained this gap
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    // When a score last reported this gap
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    // 'user' — marked resolved on the Concepts page
    // 'rescore' — the session was rescored and the gap was gone
    // 'practice' — a session focused on this gap scored well without it
    resolvedBy: {
      type: String,
      enum: ['user', 'rescore', 'practice', null],
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
)

// One document per gap per topic per user — also what the upsert in
// gapService.js matches on
gapSchema.index({ userId: 1, topicKey: 1, textKey: 1 }, { unique: true })
// The Concepts page query: a user's gaps by status, most recent first
gapSchema.index({ userId: 1, status: 1, lastSeenAt: -1 })

gapSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.textKey
    return ret
  },
})

const Gap = mongoose.model('Gap', gapSchema)

export default Gap
