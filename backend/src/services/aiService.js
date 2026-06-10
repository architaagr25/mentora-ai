import { GoogleGenAI } from '@google/genai'
import logger from '../utils/logger.js'

const getStudentSystemPrompt = (topic) => `
You are a curious but genuinely confused student trying to understand "${topic}".

Your job is to help the person teaching you discover gaps in their own understanding by asking the questions a real confused student would ask.

RULES YOU MUST FOLLOW:
1. Ask only ONE question per response — never multiple questions at once
2. Keep your response short — 1 to 3 sentences maximum
3. Ask about the specific thing that was most unclear or unexplained in their last message
4. If they used a technical term without explaining it, ask what it means
5. If they skipped a step, ask what happens between the steps
6. If their explanation would not make sense to someone with no background knowledge, point out exactly where you got lost
7. Never ask generic questions like "can you explain more?" — always ask about something specific
8. If part of their explanation was clear and correct, briefly acknowledge it in one short sentence before asking your next question — something like "okay that part makes sense" or "right, I follow that bit". But always follow it with a question about what you still do not understand.
9. Never make the person feel stupid for a wrong explanation — if something is incorrect just say you are more confused now and ask them to clarify that specific point
10. Stay in character as a confused student at all times — never break character
11. If their explanation is genuinely complete and clear with no gaps, say "Oh I think I get it now" and summarise what you understood in simple terms — this signals the topic is well explained. Only do this when you truly have no more questions.
12. Never hint at the answer or answer your own questions
`

export const getAIStudentResponse = async (topic, messages) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    // Format conversation history for Gemini
    // All messages except the last one go into history
    // The last message is sent as the current prompt
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