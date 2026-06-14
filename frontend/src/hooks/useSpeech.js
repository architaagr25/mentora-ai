import { useState, useRef, useCallback, useEffect } from 'react'

// ─────────────────────────────────────────
// useSpeech
// Wraps the browser's speechSynthesis API
// Handles speaking text aloud, cancelling,
// and tracking whether speech is in progress
// ─────────────────────────────────────────
const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  // Lazy initializer — runs once on mount, no setState needed
  const [isSupported] = useState(() => 'speechSynthesis' in window)
  const utteranceRef = useRef(null)

  // Cleanup only — no setState here
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // ─────────────────────────────────────────
  // SPEAK
  // Takes a text string, reads it aloud
  // Cancels any currently-playing speech first
  // Returns a Promise that resolves when done
  // ─────────────────────────────────────────
  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window) || !text?.trim()) {
        resolve()
        return
      }

      // Cancel anything currently playing
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utteranceRef.current = utterance

      // ─── VOICE SETTINGS ───
      // Rate: 1 is normal speed, 0.9 feels slightly more
      // natural for a "confused student" character
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      // Pick a voice — prefer an English voice if available
      // Falls back to browser default if none found
      // We do this inside speak() rather than on mount because
      // voices load asynchronously and may not be ready on mount
      const voices = window.speechSynthesis.getVoices()
      const englishVoice = voices.find(
        (v) => v.lang.startsWith('en') && !v.name.includes('Google')
        // Avoid Google voices — they sometimes cut off mid-sentence
        // on Chrome due to a known bug with long utterances
      )
      if (englishVoice) {
        utterance.voice = englishVoice
      }

      utterance.onstart = () => setIsSpeaking(true)

      utterance.onend = () => {
        setIsSpeaking(false)
        resolve()
      }

      utterance.onerror = (e) => {
        // 'interrupted' fires when we cancel() — not a real error
        if (e.error !== 'interrupted') {
          console.error('Speech error:', e.error)
        }
        setIsSpeaking(false)
        resolve()
      }

      // ─── CHROME BUG WORKAROUND ───
      // Chrome has a bug where speechSynthesis pauses after ~15 seconds
      // on long utterances. This interval keeps it alive.
      // It clears itself when speech ends via onend/onerror.
      const chromeFix = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(chromeFix)
        } else {
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        }
      }, 10000)

      utterance.onend = () => {
        clearInterval(chromeFix)
        setIsSpeaking(false)
        resolve()
      }

      utterance.onerror = (e) => {
        clearInterval(chromeFix)
        if (e.error !== 'interrupted') {
          console.error('Speech error:', e.error)
        }
        setIsSpeaking(false)
        resolve()
      }

      window.speechSynthesis.speak(utterance)
    })
  }, [])

  // ─────────────────────────────────────────
  // CANCEL
  // Stops any current speech immediately
  // ─────────────────────────────────────────
  const cancelSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  return {
    isSpeaking,
    isSupported,
    speak,
    cancelSpeech,
  }
}

export default useSpeech