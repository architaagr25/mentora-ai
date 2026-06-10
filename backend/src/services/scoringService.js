import { GoogleGenAI } from '@google/genai'
import logger from '../utils/logger.js'

const getScoringSystemPrompt = (topic) => `
You are an expert educator evaluating a student's explanation of "${topic}".

You will be given a conversation where a student was teaching this topic to a confused student.
Evaluate ONLY the teaching student's messages — ignore the confused student's questions.

Score the explanation on three dimensions from 0 to 10:

ACCURACY (0-10):
- 10: Everything stated is correct with no misconceptions
- 7-9: Mostly correct with minor imprecisions
- 4-6: Some correct points but notable errors or misconceptions
- 1-3: Mostly incorrect or fundamentally misunderstood
- 0: Completely wrong

CLARITY (0-10):
- 10: Perfectly clear, any beginner would understand
- 7-9: Clear with minor ambiguity
- 4-6: Somewhat clear but confusing in places
- 1-3: Hard to follow for most people
- 0: Incomprehensible

COMPLETENESS (0-10):
- 10: All key concepts covered thoroughly
- 7-9: Most key concepts covered
- 4-6: Some key concepts covered but significant gaps
- 1-3: Very incomplete, most key concepts missing
- 0: No meaningful content

You MUST respond with ONLY a JSON object. No preamble, no explanation, no markdown backticks.
Just the raw JSON object and nothing else.

The JSON must have exactly these fields:
{
  "accuracy": <number 0-10>,
  "clarity": <number 0-10>,
  "completeness": <number 0-10>,
  "gaps": [<string>, <string>],
  "feedback": "<string>"
}

gaps: array of specific knowledge gaps or errors found. Each gap must be one clear sentence describing exactly what was missing or wrong. Maximum 5 gaps. Empty array if none.
Examples of good gaps:
- "Did not explain why the server needs to send its own sequence number"
- "Skipped what happens if the final ACK packet is lost"
- "Confused TCP with UDP when describing connectionless communication"
Examples of bad gaps (too vague):
- "Explanation was incomplete"
- "Could have been clearer"

feedback: exactly 2-3 sentences maximum. Be specific and constructive. Tell the student what they did well and what to focus on next. No generic praise.
`

export const scoreSession = async (topic, messages) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const userMessages = messages.filter((msg) => msg.role === 'user')
    if (userMessages.length === 0) {
      return {
        success: false,
        error: 'No user messages to score',
      }
    }

    const conversationText = messages
      .map((msg) => {
        const role = msg.role === 'user' ? 'STUDENT TEACHING' : 'CONFUSED STUDENT'
        return `${role}: ${msg.content}`
      })
      .join('\n\n')

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: conversationText,
      config: {
        systemInstruction: getScoringSystemPrompt(topic),
        maxOutputTokens: 400,
        temperature: 0.1,
      },
    })

    const responseText = response.text

    let scores
    try {
      const cleaned = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      scores = JSON.parse(cleaned)
    } catch {
      logger.error(`Failed to parse scoring response: ${responseText}`)
      return {
        success: false,
        error: 'Failed to parse scoring response',
      }
    }

    const clamp = (val) => Math.min(10, Math.max(0, Math.round(val)))

    return {
      success: true,
      scores: {
        accuracy: clamp(scores.accuracy),
        clarity: clamp(scores.clarity),
        completeness: clamp(scores.completeness),
        gaps: Array.isArray(scores.gaps) ? scores.gaps : [],
        feedback: scores.feedback || '',
        scoredAt: new Date(),
      },
    }
  } catch (err) {
    logger.error(`Scoring service error: ${err.message}`)
    return {
      success: false,
      error: err.message,
    }
  }
}