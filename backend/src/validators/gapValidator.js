import { z } from 'zod'

const gapStatus = z.enum(['open', 'resolved'])

// ─────────────────────────────────────────
// LIST GAPS
// ?status=open|resolved — omitted returns both
// ─────────────────────────────────────────
export const listGapsQuerySchema = z.object({
  status: gapStatus.optional(),
})

// ─────────────────────────────────────────
// UPDATE GAP
// Mark resolved, or reopen
// ─────────────────────────────────────────
export const updateGapSchema = z.object({
  status: gapStatus,
})
