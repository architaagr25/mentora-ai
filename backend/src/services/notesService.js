import pdf from 'pdf-parse/lib/pdf-parse.js'
import { GoogleGenAI } from '@google/genai'
import logger from '../utils/logger.js'

const CHUNK_SIZE = 15000
// Each chunk sent to Gemini separately.
// 15,000 chars ≈ 8-10 pages of dense text.

const MAX_CHUNKS = 5
// Cap at 5 chunks = up to ~75 pages.
// Beyond that we stop — the session is topic-scoped anyway,
// not meant for an entire textbook.

const MAX_TOTAL_CONCEPTS = 15
// Even if 5 chunks each return 15 concepts, we cap the final
// list at 15 so the AI prompt doesn't get unwieldy.

// ─────────────────────────────────────────
// SPLIT TEXT INTO CHUNKS
// Tries to split on paragraph boundaries (\n\n) so we don't
// cut a sentence in half, which would confuse Gemini.
// Falls back to hard splitting if no paragraph break is found.
// ─────────────────────────────────────────
const splitIntoChunks = (text) => {
  const chunks = []
  let remaining = text

  while (remaining.length > 0 && chunks.length < MAX_CHUNKS) {
    if (remaining.length <= CHUNK_SIZE) {
      chunks.push(remaining)
      break
    }

    // Try to find a paragraph break near the chunk boundary
    const slice = remaining.slice(0, CHUNK_SIZE)
    const lastBreak = slice.lastIndexOf('\n\n')

    const cutAt = lastBreak > CHUNK_SIZE * 0.5
      ? lastBreak          // good paragraph break found in the second half
      : CHUNK_SIZE         // no good break — hard cut

    chunks.push(remaining.slice(0, cutAt).trim())
    remaining = remaining.slice(cutAt).trim()
  }

  return chunks
}

// ─────────────────────────────────────────
// EXTRACT CONCEPTS FROM A SINGLE CHUNK
// ─────────────────────────────────────────
const extractConceptsFromChunk = async (ai, topic, chunkText, chunkIndex, totalChunks) => {
  const systemPrompt = `
You are an expert educator. A student has uploaded their study notes about "${topic}".
${totalChunks > 1 ? `You are reading part ${chunkIndex + 1} of ${totalChunks} of their notes.` : ''}

Extract a focused list of concepts, facts, and ideas from this text that the student should be able to explain clearly. These will be used to guide a teaching session.

RULES:
- Extract between 3 and 10 concepts from this section
- Each concept must be a clear, testable idea — not a vague theme
- Phrase each as a short noun or noun phrase (e.g. "TCP three-way handshake", "Big O notation")
- Only extract what is actually in this text — do not add outside knowledge
- If this section contains no useful concepts, return an empty array

Respond with ONLY a raw JSON object. No markdown, no backticks, no explanation.
The shape must be exactly:
{ "concepts": ["concept 1", "concept 2"] }
`

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: chunkText,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 400,
      temperature: 0.2,
    },
  })

  const raw = response.text.replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.concepts)
      ? parsed.concepts
          .filter((c) => typeof c === 'string' && c.trim().length > 0)
          .map((c) => c.trim())
      : []
  } catch {
    logger.warn(`Failed to parse concepts from chunk ${chunkIndex}: ${raw}`)
    return []
  }
}

// ─────────────────────────────────────────
// DEDUPLICATE CONCEPTS
// Case-insensitive. "TCP Handshake" and "tcp handshake" are the same.
// Keeps the first version encountered.
// ─────────────────────────────────────────
const deduplicateConcepts = (concepts) => {
  const seen = new Set()
  return concepts.filter((c) => {
    const key = c.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─────────────────────────────────────────
// EXTRACT TEXT FROM PDF
// ─────────────────────────────────────────
export const extractTextFromPdf = async (buffer) => {
  try {
    const data = await pdf(buffer)
    const text = data.text?.trim() || ''

    if (!text || text.length < 20) {
      return {
        success: false,
        error: 'PDF appears to be empty or unreadable. Try a text-based PDF rather than a scanned image.',
      }
    }

    return {
      success: true,
      text,
      pageCount: data.numpages,
    }
  } catch (err) {
    logger.error(`PDF extraction error: ${err.message}`)
    return {
      success: false,
      error: 'Could not read the PDF file. Make sure it is a valid PDF.',
    }
  }
}

// ─────────────────────────────────────────
// EXTRACT CONCEPTS FROM TEXT (with chunking)
// ─────────────────────────────────────────
export const extractConceptsFromText = async (topic, text) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const chunks = splitIntoChunks(text)
    logger.info(`Extracting concepts from ${chunks.length} chunk(s) for topic: "${topic}"`)

    // Run Gemini on each chunk — sequentially to avoid rate limits
    const allConcepts = []
    for (let i = 0; i < chunks.length; i++) {
      const concepts = await extractConceptsFromChunk(ai, topic, chunks[i], i, chunks.length)
      allConcepts.push(...concepts)
    }

    const deduplicated = deduplicateConcepts(allConcepts).slice(0, MAX_TOTAL_CONCEPTS)

    if (deduplicated.length === 0) {
      return {
        success: false,
        error: 'No concepts could be extracted from these notes. Try uploading more detailed notes.',
      }
    }

    return { success: true, concepts: deduplicated }
  } catch (err) {
    logger.error(`Concept extraction error: ${err.message}`)
    return { success: false, error: err.message }
  }
}