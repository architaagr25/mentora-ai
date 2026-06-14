import { useState, useRef, useCallback } from 'react'

// ─────────────────────────────────────────
// useVoiceRecorder
// Wraps the browser's MediaRecorder API
// Handles mic permission, recording, and
// returning the audio blob when done
// ─────────────────────────────────────────
const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)

  // ─────────────────────────────────────────
  // START RECORDING
  // Requests mic permission, starts MediaRecorder
  // Returns true if started successfully
  // ─────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setError(null)

    try {
      // Request mic access — browser will show permission prompt
      // if not already granted
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Figure out the best supported audio format for this browser
      // webm is supported on Chrome/Edge/Firefox
      // mp4 is the fallback for Safari/iOS
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      // Each time MediaRecorder has data ready, push it to chunks
      // This fires periodically while recording (every ~250ms)
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      // Start recording, collect data every 250ms
      mediaRecorder.start(250)
      setIsRecording(true)

      return true
    } catch (err) {
      // Most common error: user denied mic permission
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow mic access and try again.')
      } else {
        setError(`Could not start recording: ${err.message}`)
      }
      return false
    }
  }, [])

  // ─────────────────────────────────────────
  // STOP RECORDING
  // Stops MediaRecorder, releases mic,
  // returns a Promise that resolves with
  // { blob, mimeType } when fully stopped
  // ─────────────────────────────────────────
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null)
        return
      }

      // onstop fires after MediaRecorder finishes writing
      // all remaining chunks — safe place to build the blob
      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType
        const blob = new Blob(chunksRef.current, { type: mimeType })

        // Release the mic — stops the recording indicator
        // in the browser tab (the red dot)
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

  // ─────────────────────────────────────────
  // CLEANUP
  // Call this in useEffect cleanup to release
  // mic if the component unmounts mid-recording
  // ─────────────────────────────────────────
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