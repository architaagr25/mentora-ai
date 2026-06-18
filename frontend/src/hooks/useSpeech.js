import { useState, useRef, useCallback, useEffect } from 'react'

const VOICE_STORAGE_KEY = 'mentora_voice_name'

const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isSupported] = useState(() => 'speechSynthesis' in window)
  const [voices, setVoices] = useState([])
  const [selectedVoiceName, setSelectedVoiceName] = useState(() => {
    try {
      return localStorage.getItem(VOICE_STORAGE_KEY) || null
    } catch {
      return null
    }
  })
  const utteranceRef = useRef(null)

  // ─────────────────────────────────────────
  // LOAD AVAILABLE VOICES
  // Voices load asynchronously — Chrome fires
  // 'voiceschanged' once they're ready
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!('speechSynthesis' in window)) return

    const loadVoices = () => {
      const available = window.speechSynthesis
        .getVoices()
        .filter((v) => v.lang.startsWith('en'))
      setVoices(available)
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  // ─────────────────────────────────────────
  // SET VOICE
  // Persists the choice to localStorage
  // ─────────────────────────────────────────
  const setVoice = useCallback((voiceName) => {
    setSelectedVoiceName(voiceName)
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, voiceName)
    } catch {
      // silent
    }
  }, [])

  const speak = useCallback((text) => {
    return new Promise(async (resolve) => {
      if (!('speechSynthesis' in window) || !text?.trim()) {
        resolve()
        return
      }

     window.speechSynthesis.cancel()
      setIsPaused(false)

      // Small delay after cancel — Chrome sometimes drops the next
      // speak() call if it fires immediately after a cancel()
      await new Promise((r) => setTimeout(r, 50))

      const utterance = new SpeechSynthesisUtterance(text)
      utteranceRef.current = utterance

      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      // ─── VOICE SELECTION ───
      // Use the user's chosen voice if set and still available,
      // otherwise fall back to the first non-Google English voice
      const available = window.speechSynthesis.getVoices()
      const chosen = selectedVoiceName
        ? available.find((v) => v.name === selectedVoiceName)
        : null
      const fallback = available.find(
        (v) => v.lang.startsWith('en') && !v.name.includes('Google')
      )
      const voiceToUse = chosen || fallback

      if (voiceToUse) {
        utterance.voice = voiceToUse
      }

      utterance.onstart = () => {
        setIsSpeaking(true)
        setIsPaused(false)
      }

      const chromeFix = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(chromeFix)
        } else if (!window.speechSynthesis.paused) {
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        }
      }, 10000)

      // Safety net — if speech doesn't naturally end within
      // a reasonable time for the text length, force-resolve
      // so the UI never gets stuck on "AI is speaking"
      const estimatedDuration = Math.max(text.length * 80, 3000) + 5000
      const safetyTimeout = setTimeout(() => {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel()
        }
        clearInterval(chromeFix)
        setIsSpeaking(false)
        setIsPaused(false)
        resolve()
      }, estimatedDuration)

      utterance.onend = () => {
        clearTimeout(safetyTimeout)
        clearInterval(chromeFix)
        setIsSpeaking(false)
        setIsPaused(false)
        resolve()
      }

      utterance.onerror = (e) => {
        clearTimeout(safetyTimeout)
        clearInterval(chromeFix)
        if (e.error !== 'interrupted') {
          // silent — speech errors are non-fatal in voice mode
        }
        setIsSpeaking(false)
        setIsPaused(false)
        resolve()
      }

      window.speechSynthesis.speak(utterance)
    })
  }, [selectedVoiceName])

  const cancelSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
    }
  }, [])

  const togglePause = useCallback(() => {
    if (!('speechSynthesis' in window)) return
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    } else {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }, [])

  // ─── PREVIEW A VOICE ───
  // Used by the voice picker UI to let the user
  // hear a sample before selecting
  const previewVoice = useCallback((voiceName) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(
      "Hi! So how does this work exactly?"
    )
    const available = window.speechSynthesis.getVoices()
    const voice = available.find((v) => v.name === voiceName)
    if (voice) utterance.voice = voice
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }, [])

  return {
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    selectedVoiceName,
    setVoice,
    previewVoice,
    speak,
    cancelSpeech,
    togglePause,
  }
}

export default useSpeech