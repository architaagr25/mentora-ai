// backend/src/utils/replyRules.js

// ─────────────────────────────────────────
// REPLY RULE CHECK
// The AI student must never hand over information the teacher didn't
// give, and must ask one question at a time. The prompt steers this
// strongly but not perfectly — in testing the student kept finding new
// ways to challenge a wrong claim with an outside fact:
//   "but doesn't RAM lose everything when the power goes off?"
//   "but isn't RAM temporary?"
//   "I thought RAM loses everything when the power goes off"
//   "how does that make it durable if the power goes out?"
//
// Matching those phrasings one by one doesn't generalise, so this looks
// at structure instead. Any sub-clause introduced by a connector that
// brings in a claim or situation — if / when / because / since, "I
// thought", "but isn't…", "or does it…" — must be built only from words
// the teacher has used (plus the topic and concept names). A single new
// content word there means the student supplied something itself.
//
// A flagged draft is regenerated once (see aiService.js), so only
// suspect replies cost an extra AI call.
// ─────────────────────────────────────────

// Generic words that carry no topic information
const STOPWORDS = new Set(
  `about above across actually after again against also always another anything anyway
  around away back basically became because become been before being below between both
  bring came come comes coming could couldn didn does doesn doing done down during each
  either else even ever every everything exactly first from gets getting give given goes
  going gone good happen happened happening happens have haven having here into itself
  just keep keeps kind know knows last least less like little long look made make makes
  making many maybe mean meaning means might more most much must need never next nothing
  okay once only other others over part parts point quite rather really right same seem
  seems sense should shouldn since some something sort still such sure take takes tell
  than that their them then there these they thing things think this those though through
  together totally understand until very want wait were what when where whether which
  while whole will with within without would wouldn your yours follow following clicks
  click clicked confused confusing idea ideas work works second third said says saying
  mentioned aren isn hasn earlier later system systems manage stay stays stayed actual
  able maybe perhaps somehow`.split(/\s+/)
)

const contentWords = (text) =>
  (String(text).toLowerCase().match(/[a-z]+/g) || []).filter(
    (w) => w.length >= 4 && !STOPWORDS.has(w)
  )

// Crude stemming by 4-letter prefix: "loses"/"lose", "undone"/"undo"
const stemOf = (w) => w.slice(0, 4)

const unsaidWords = (text, allowedStems) => [
  ...new Set(contentWords(text).filter((w) => !allowedStems.has(stemOf(w)))),
]

// Connectors that introduce a claim or situation. What follows each one
// (up to the next clause boundary) must come from the teacher's words.
const ALTERNATIVE = /\bor (?:does|do|is|are|would|will|did|can) (?:it|that|they|this|the)\b/gi
const CLAIM_TRIGGERS = [
  // "…but doesn't / isn't / wouldn't X…?"
  /(?:^|[,;]\s*|\bbut\s+|\band\s+|\bso\s+|\bwait,?\s+)(?:doesn'?t|isn'?t|wouldn'?t|won'?t|can'?t|don'?t|aren'?t|shouldn'?t|couldn'?t)\b/gi,
  // "if / when / because / since …"
  /\b(?:if|when|whenever|once|unless|in case|because|since)\b/gi,
  // "I thought / I heard / isn't it true …"
  /\bI (?:thought|heard|read|remember|believe|assumed|figured)\b|\bisn'?t it true\b/gi,
]
// Where a sub-clause ends
const CLAUSE_END = /[,;.?!—–]|\s(?:how|what|why|where|which|who)\b/

// A second question joined on: "…stand for, and what does it mean?"
const SECOND_QUESTION =
  /,?\s+and (?:then )?(?:what|how|why|where|when|which|who|does|do|is|are|can)\b/i

// The student expressing doubt — used to tell when a hint is now allowed
const DOUBT =
  /(doesn'?t sit right|confus|not sure|still don'?t|doesn'?t make sense|\blost\b|how does .* make|what does .* have to do)/i

// The text after a trigger, up to the next clause boundary
const subClauseAfter = (reply, match) => {
  const rest = reply.slice(match.index + match[0].length)
  const end = rest.search(CLAUSE_END)
  return end === -1 ? rest : rest.slice(0, end)
}

// Returns null when the reply is fine, otherwise { rule, instruction }.
// teacherText should include the topic and any concept names as well as
// everything the teacher said — those words are all fair to use.
export const findRuleViolation = (reply, { teacherText = '', allowHint = false } = {}) => {
  if (!reply) return null

  if ((reply.match(/\?/g) || []).length >= 2) {
    return {
      rule: 'one-question',
      instruction: 'Your draft asked more than one question. Ask exactly ONE question.',
    }
  }
  for (const sentence of reply.split(/(?<=[.?!])\s+|\s+[—–]\s+/)) {
    if (SECOND_QUESTION.test(sentence) && /\?\s*$/.test(sentence)) {
      return {
        rule: 'one-question',
        instruction: 'Your draft joined two questions together. Ask exactly ONE question.',
      }
    }
  }

  const allowedStems = new Set(contentWords(teacherText).map(stemOf))

  // Never allowed, even as a hint: it hands over a candidate answer
  for (const match of reply.matchAll(ALTERNATIVE)) {
    if (unsaidWords(subClauseAfter(reply, match), allowedStems).length > 0) {
      return {
        rule: 'offered-answer',
        instruction:
          'Your draft suggested an alternative explanation the teacher never gave, which hands them the answer. Do not suggest what the answer might be — only question their own claim.',
      }
    }
  }

  // Rule 14 allows a small "what would happen if…" hint after two doubts
  if (allowHint) return null

  for (const trigger of CLAIM_TRIGGERS) {
    for (const match of reply.matchAll(trigger)) {
      const unsaid = unsaidWords(subClauseAfter(reply, match), allowedStems)
      if (unsaid.length > 0) {
        return {
          rule: 'outside-fact',
          instruction: `Your draft brought in things the teacher never mentioned (${unsaid
            .slice(0, 4)
            .join(', ')}). Challenge their claim using ONLY their own words — no new facts, beliefs or "what if" situations yet.`,
        }
      }
    }
  }

  return null
}

// Rule 14: once the student has doubted the teacher twice in a row, a
// small "what would happen if…" hint becomes allowed
export const isHintAllowed = (messages) => {
  const lastTwo = messages.filter((m) => m.role === 'assistant').slice(-2)
  return lastTwo.length === 2 && lastTwo.every((m) => DOUBT.test(m.content))
}
