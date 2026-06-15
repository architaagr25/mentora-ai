import { useState, useRef, useCallback } from 'react'

const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)

  const startRecording = useCallback(async () => {
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Prefer opus codec — smaller file, faster upload to Gemini
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.start(250)
      setIsRecording(true)

      return true
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow mic access and try again.')
      } else {
        setError(`Could not start recording: ${err.message}`)
      }
      return false
    }
  }, [])

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null)
        return
      }

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType
        const blob = new Blob(chunksRef.current, { type: mimeType })

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        chunksRef.current = []
        setIsRecording(false)

        resolve({ blob, mimeType })
      }

      mediaRecorder.stop()
    })
  }, [])

  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsRecording(false)
  }, [])

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
    cleanup,
  }
}

export default useVoiceRecorder