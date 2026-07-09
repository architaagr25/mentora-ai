import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Plus,
  Loader2,
  Upload,
  FileText,
  Trash2,
  AlertCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useSessionStore from '@/store/sessionStore'
import api from '@/api'

const NewSessionModal = ({ onClose, initialTopic = '', restartNotice = null }) => {
  const navigate = useNavigate()
  const { createSession } = useSessionStore()

  // ─── Topic state ───
  const [topic, setTopic] = useState(initialTopic)
  const [topicError, setTopicError] = useState('')

  // ─── PDF state ───
  const [pdfFile, setPdfFile] = useState(null)
  // The File object selected by the user — null if none selected
  const [pdfError, setPdfError] = useState('')

  // ─── Loading state ───
  // We track these separately so we can show different messages:
  // "Creating session..." vs "Extracting concepts..."
  const [isCreating, setIsCreating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef(null)

  // ─────────────────────────────────────────
  // FILE SELECTION
  // Validates the file before accepting it.
  // We check type and size here on the frontend
  // so the user gets instant feedback without
  // waiting for a network round-trip.
  // ─────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setPdfError('Only PDF files are allowed')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setPdfError('File must be under 10MB')
      return
    }

    setPdfFile(file)
    setPdfError('')
    // Reset the input so the same file can be re-selected
    // if the user removes it and tries again
    e.target.value = ''
  }

  const handleRemovePdf = () => {
    setPdfFile(null)
    setPdfError('')
  }

  // ─────────────────────────────────────────
  // START SESSION
  // Two-step process:
  // 1. Create the session (always)
  // 2. Upload the PDF (only if one was selected)
  // If the PDF upload fails we still navigate to the
  // session — the AI just won't be notes-scoped.
  // We never block the user from starting because of
  // a non-essential upload failure.
  // ─────────────────────────────────────────
  const handleStart = async () => {
    if (!topic.trim()) {
      setTopicError('Please enter a topic')
      return
    }
    if (topic.trim().length < 2) {
      setTopicError('Topic must be at least 2 characters')
      return
    }

    setIsCreating(true)
    setTopicError('')

    // Step 1: Create the session
    const session = await createSession(topic.trim())
    if (!session) {
      setIsCreating(false)
      setTopicError('Failed to create session. Please try again.')
      return
    }

    // Step 2: Upload PDF if one was selected
    if (pdfFile) {
      setIsCreating(false)
      setIsUploading(true)

      try {
        const formData = new FormData()
        formData.append('pdf', pdfFile)
        // 'pdf' must match the field name in uploadPdf.single('pdf')
        // on the backend

        await api.post(`/sessions/${session._id}/notes`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } catch {
  // Non-fatal — PDF upload failed but session still works.
  // The AI just won't be scoped to the uploaded notes.
} finally {
        setIsUploading(false)
      }
    }

    navigate(`/session/${session._id}`)
  }

  const isProcessing = isCreating || isUploading

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isProcessing ? onClose : undefined}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        <div className="bg-[#0D1426] border border-slate-700 rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">New Teaching Session</h2>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
            >
              <X size={20} />
            </button>
          </div>

          {/* Restart notice — shown when opened via "Practice" on a topic
              whose previous session(s) are all completed, explaining why
              a new session is starting instead of resuming the old one. */}
          {restartNotice && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs leading-relaxed">
              Your previous session on <span className="font-semibold">"{restartNotice}"</span> is complete.
              Start a new session to keep practicing this topic.
            </div>
          )}
          {/* Topic input */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              What do you want to teach?
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value)
                setTopicError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isProcessing) handleStart()
              }}
              placeholder="e.g. TCP Handshake, Binary Search Trees..."
              autoFocus
              disabled={isProcessing}
              className={`w-full px-4 py-3 rounded-xl bg-[#080D1A] border text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all disabled:opacity-50 ${
                topicError
                  ? 'border-red-500/60'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            />
            {topicError && (
              <p className="mt-1.5 text-xs text-red-400">{topicError}</p>
            )}
            <p className="mt-2 text-xs text-slate-600">
              Be specific — "TCP Handshake" works better than "Networking"
            </p>
          </div>

          {/* PDF upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Upload notes{' '}
              <span className="text-slate-500 font-normal">(optional)</span>
            </label>

            {!pdfFile ? (
              // Drop zone — shown when no file selected
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed border-slate-700 hover:border-violet-500/60 hover:bg-violet-500/5 text-slate-500 hover:text-slate-300 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload size={20} />
                <span className="text-sm">Click to upload a PDF</span>
                <span className="text-xs text-slate-600">Max 10MB · PDF only · Max 75 pages</span>
              </button>
            ) : (
              // File preview — shown when a file is selected
              <div className="rounded-xl border border-slate-700 bg-[#080D1A] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-violet-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">
                      {pdfFile.name}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {(pdfFile.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    onClick={handleRemovePdf}
                    disabled={isProcessing}
                    className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* PDF error */}
            <AnimatePresence>
              {pdfError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 flex items-center gap-1.5 text-red-400 text-xs"
                >
                  <AlertCircle size={12} />
                  {pdfError}
                </motion.div>
              )}
            </AnimatePresence>

            {pdfFile && (
              <p className="mt-2 text-xs text-slate-600">
                The AI will quiz you only on concepts from your notes
              </p>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={isProcessing}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Extracting concepts...
              </>
            ) : isCreating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating session...
              </>
            ) : (
              <>
                <Plus size={18} />
                Start Teaching
              </>
            )}
          </button>

        </div>
      </motion.div>
    </>
  )
}

export default NewSessionModal