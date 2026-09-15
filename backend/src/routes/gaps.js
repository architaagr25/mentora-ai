// backend/src/routes/gaps.js
import express from 'express'
import mongoose from 'mongoose'
import Gap from '../models/Gap.js'
import auth from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { listGapsQuerySchema, updateGapSchema } from '../validators/gapValidator.js'
import { backfillGapsForUser } from '../services/gapService.js'

const router = express.Router()

router.use(auth)

// Plenty for a Concepts page; stops one request loading everything
const MAX_GAPS = 500

// ─────────────────────────────────────────
// GET /api/gaps?status=open|resolved
// The logged-in user's gaps, most recently seen first, plus how many
// are open and resolved (for the filter tabs).
// ─────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const result = listGapsQuerySchema.safeParse(req.query)
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        errors: result.error.flatten().fieldErrors,
      })
    }

    await backfillGapsForUser(req.user._id)

    const filter = { userId: req.user._id }
    if (result.data.status) filter.status = result.data.status

    const [gaps, open, resolved] = await Promise.all([
      Gap.find(filter).sort({ lastSeenAt: -1 }).limit(MAX_GAPS),
      Gap.countDocuments({ userId: req.user._id, status: 'open' }),
      Gap.countDocuments({ userId: req.user._id, status: 'resolved' }),
    ])

    res.status(200).json({
      status: 'success',
      count: gaps.length,
      counts: { open, resolved },
      gaps,
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────
// PATCH /api/gaps/:id
// Body: { status: 'resolved' | 'open' }
// Another user's gap is reported as not found, not forbidden, so ids
// can't be probed.
// ─────────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const result = updateGapSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        errors: result.error.flatten().fieldErrors,
      })
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError('Gap not found', 404)
    }

    const gap = await Gap.findOne({ _id: req.params.id, userId: req.user._id })
    if (!gap) throw new AppError('Gap not found', 404)

    const { status } = result.data
    if (gap.status !== status) {
      gap.status = status
      gap.resolvedAt = status === 'resolved' ? new Date() : null
      gap.resolvedBy = status === 'resolved' ? 'user' : null
      await gap.save()
    }

    res.status(200).json({
      status: 'success',
      gap,
    })
  } catch (err) {
    next(err)
  }
})

export default router
