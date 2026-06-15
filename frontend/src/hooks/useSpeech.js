import { useState, useRef, useCallback, useEffect } from 'react'

const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isSupported] = useState(() => 'speechSynthesis' in window)
  const utteranceRef = useRef(null)

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window) || !text?.trim()) {
        resolve()
        return
      }

      window.speechSynthesis.cancel()
      setIsPaused(false)

      const utterance = new SpeechSynthesisUtterance(text)
      utteranceRef.current = utterance

      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      const voices = window.speechSynthesis.getVoices()
      const englishVoice = voices.find(
        (v) => v.lang.startsWith('en') && !v.name.includes('Google')
      )
      if (englishVoice) {
        utterance.voice = englishVoice
      }

      utterance.onstart = () => {
        setIsSpeaking(true)
        setIsPaused(false)
      }

      // Chrome bug workaround — speechSynthesis silently
      // pauses after ~15 seconds on long utterances
      const chromeFix = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(chromeFix)
        } else if (!window.speechSynthesis.paused) {
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        }
      }, 10000)

      utterance.onend = () => {
        clearInterval(chromeFix)
        setIsSpeaking(false)
        setIsPaused(false)
        resolve()
      }

      utterance.onerror = (e) => {
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
  }, [])

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

  return {
    isSpeaking,
    isPaused,
    isSupported,
    speak,
    cancelSpeech,
    togglePause,
  }
}

export default useSpeech