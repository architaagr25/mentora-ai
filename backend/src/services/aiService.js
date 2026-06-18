import { GoogleGenAI } from '@google/genai'
import logger from '../utils/logger.js'

const getStudentSystemPrompt = (topic) => `
You are a curious but genuinely confused student trying to understand "${topic}".

Your job is to help the person teaching you discover gaps in their own understanding by asking the questions a real confused student would ask.

RULES YOU MUST FOLLOW:
1. Ask only ONE question per response — never multiple questions at once
2. Keep your response VERY SHORT — 1 sentence, maximum 2 sentences. Never write paragraphs.
3. Ask about the specific thing that was most unclear or unexplained in their last message
4. If they used a technical term without explaining it, ask what it means
5. If they skipped a step, ask what happens between the steps
6. If their explanation would not make sense to someone with no background knowledge, point out exactly where you got lost
7. Never ask generic questions like "can you explain more?" — always ask about something specific
8. If part of their explanation was clear and correct, briefly acknowledge it in a few words (e.g. "okay that makes sense —") before asking your next question. Do not summarise or restate their whole explanation.
9. Never make the person feel stupid for a wrong explanation — if something is incorrect just say you are more confused now and ask them to clarify that specific point
10. Stay in character as a confused student at all times — never break character
11. On your FIRST attempt at a particular gap, NEVER explain the concept yourself, never fill in gaps with your own knowledge, and never assume what the user means. Phrase it as a short check, like "Wait, so is X basically Y?" or "So does that mean...?", and let them confirm or correct it.
12. If the person responds with a short non-answer like "yes," "I agree," "okay," or "right" without adding any new explanation, do NOT repeat your previous question verbatim. Instead, rephrase it differently AND get more specific — ask them to explain the "why" behind their "yes" in their own words. For example, instead of repeating "does that mean X?", ask "why does that work that way?" or "what makes you say yes — walk me through it?"
13. If you notice you are about to ask something very similar to a question you already asked in this conversation, you MUST phrase it completely differently or give a small hint about what's missing instead. Never output the same or nearly the same sentence twice in a row.
14. If the SAME underlying gap is still unresolved after two of your attempts, give a small honest nudge on your THIRD attempt — point out specifically what's still missing or unclear, in one short sentence, without giving the full answer. For example: "I think the part about why sequence numbers matter is still missing — can you try explaining just that bit?"
15. If their explanation is genuinely complete and clear with no gaps, say "Oh I think I get it now" and briefly state in one short sentence what you understood — phrased as a check for them to confirm, not a declaration. Only do this when you truly have no more questions.
16. Never hint at the full answer or directly tell them what the correct concept is — only point at what's still unclear, never explain it for them
`

// ─────────────────────────────────────────
// HELPER — Check if two strings are basically identical
// Used to detect when the AI repeats itself verbatim
// ─────────────────────────────────────────
const isNearDuplicate = (a, b) => {
  if (!a || !b) return false
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  return normalize(a) === normalize(b)
}

// ─────────────────────────────────────────
// GET AI STUDENT RESPONSE — NON-STREAMING
// Used by the REST endpoint POST /api/sessions/:id/message
// ─────────────────────────────────────────
export const getAIStudentResponse = async (topic, messages) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))

    const lastMessage = messages[messages.length - 1]

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [
        ...history,
        {
          role: 'user',
          parts: [{ text: lastMessage.content }],
        },
      ],
      config: {
        systemInstruction: getStudentSystemPrompt(topic),
        maxOutputTokens: 300,
        temperature: 0.7,
      },
    })

    return {
      success: true,
      content: response.text,
    }
  } catch (err) {
    logger.error(`AI service error: ${err.message}`)
    return {
      success: false,
      error: err.message,
    }
  }
}

// ─────────────────────────────────────────
// GET AI STUDENT RESPONSE — STREAMING VERSION
// Generates the response, checks if it's a near-duplicate
// of the AI's previous message, and regenerates with an
// explicit anti-repeat instruction if so. Then streams the
// final chosen text to the client word-by-word.
// ─────────────────────────────────────────
export const getAIStudentResponseStream = async (
  topic,
  messages,
  { onChunk, onComplete, onError }
) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    // Only send the most recent messages — very long histories
    // with repetitive short exchanges can cause the model to
    // get stuck on old patterns rather than generating fresh output
    const recentMessages = messages.slice(-20)
    const history = recentMessages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))

    const lastMessage = recentMessages[recentMessages.length - 1]

    const previousAiMessages = messages.filter((m) => m.role === 'assistant')
    const lastAiMessage = previousAiMessages[previousAiMessages.length - 1]?.content || ''

    const generateOnce = async (extraInstruction = '') => {
      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash-lite',
        contents: [
          ...history,
          {
            role: 'user',
            parts: [{ text: lastMessage.content }],
          },
        ],
        config: {
          systemInstruction: getStudentSystemPrompt(topic) + extraInstruction,
          maxOutputTokens: 300,
          temperature: 0.9,
        },
      })

      let result = ''
      for await (const chunk of stream) {
        if (chunk.text) result += chunk.text
      }
      return result
    }

    let fullResponse = await generateOnce()

    if (isNearDuplicate(fullResponse, lastAiMessage)) {
      logger.info('Detected near-duplicate AI response, regenerating with anti-repeat instruction')
      fullResponse = await generateOnce(
        `\n\nIMPORTANT: Your previous question was "${lastAiMessage}". Do NOT repeat this question. You must ask something different — either rephrase completely, point out specifically what is still unclear, or give a small hint about what's missing.`
      )

      if (isNearDuplicate(fullResponse, lastAiMessage)) {
        logger.info('Retry also produced a duplicate — using fallback nudge')
        fullResponse = "I think I'm still stuck on the same part — can you try explaining it a completely different way, maybe with an example?"
      }
    }

    const words = fullResponse.split(' ')
    for (let i = 0; i < words.length; i++) {
      onChunk(words[i] + (i < words.length - 1 ? ' ' : ''))
      await new Promise((r) => setTimeout(r, 30))
    }

    onComplete(fullResponse)
  } catch (err) {
    logger.error(`AI streaming error: ${err.message}`)
    onError(err.message)
  }
}

// ─────────────────────────────────────────
// TRANSCRIBE AUDIO
// Accepts a base64-encoded audio string + mimeType
// Sends to Gemini and returns the transcript text
// Used by the voice mode endpoint
// ─────────────────────────────────────────
export const transcribeAudio = async (audioBase64, mimeType) => {
  try {
    logger.info(`Audio mimeType received: ${mimeType}, base64 length: ${audioBase64.length}`)

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: 'You are a transcription engine, not a conversational assistant. Transcribe the speech in this audio exactly as spoken. If there is no discernible human speech (silence, background noise, a timestamp-like sound, or an unclear/very short clip), respond with exactly: [NO_SPEECH]. Never apologize, never explain, never refuse, never output a timestamp — only output the transcript or [NO_SPEECH].',
            },
          ],
        },
      ],
      config: {
        maxOutputTokens: 500,
        temperature: 0,
      },
    })

    const transcript = response.text.trim()
    logger.info(`Raw Gemini transcription: "${transcript}"`)

    const nonAnswerPatterns = [
      /\[no_speech\]/i,
      /i'?m sorry/i,
      /sorry,? i/i,
      /can'?t (help|assist|transcribe)/i,
      /not (able|sure) (to|if)/i,
      /\b(silence|no speech|no audio|inaudible|blank)\b/i,
      /there is no/i,
      /no speech/i,
      /as an ai/i,
    ]
    const isNonAnswer = nonAnswerPatterns.some((pattern) => pattern.test(transcript))

    const isTimestamp = /^\[?\d{1,2}:\d{2}(:\d{2})?\]?$/.test(transcript)

    const isTooShort = transcript.replace(/[^a-zA-Z0-9]/g, '').length < 3

    if (isNonAnswer || isTimestamp || isTooShort || transcript.length === 0) {
      logger.info(`Transcription rejected as non-speech: "${transcript}"`)
      return {
        success: true,
        transcript: '',
      }
    }

    return {
      success: true,
      transcript,
    }
  } catch (err) {
    logger.error(`Transcription error: ${err.message}`)
    return {
      success: false,
      error: err.message,
    }
  }
}