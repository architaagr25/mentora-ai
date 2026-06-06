import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Play, Sparkles, GraduationCap } from 'lucide-react'

const floatingTopics = [
  'Binary Search Trees', 'Quantum Entanglement', 'Eigenvectors',
  'DNA Replication', 'TCP Handshake', 'Bayes Theorem',
  'CAP Theorem', 'Photosynthesis',
]

const chatMessages = [
  { role: 'user', text: 'A binary search tree stores values so that for every node, the left subtree only contains smaller values and the right subtree only contains larger ones.' },
  { role: 'ai', text: 'Why must left child values be smaller? What would break if I inserted an equal value on the left?' },
  { role: 'user', text: 'Because... the search algorithm relies on a strict ordering. If equal values went left, you\'d have ambiguity when searching.' },
  { role: 'ai', text: 'Interesting — so what happens to the time complexity if the tree becomes completely unbalanced?' },
]

const HeroSection = () => {
  const [visibleMessages, setVisibleMessages] = useState(0)
  const [topicIndex, setTopicIndex] = useState(0)

  // Animate chat messages appearing one by one
  useEffect(() => {
    if (visibleMessages >= chatMessages.length) {
      setTimeout(() => setVisibleMessages(0), 3000)
      return
    }
    const timer = setTimeout(() => {
      setVisibleMessages(v => v + 1)
    }, visibleMessages === 0 ? 1000 : 2500)
    return () => clearTimeout(timer)
  }, [visibleMessages])

  // Cycle floating topic badges
  useEffect(() => {
    const timer = setInterval(() => setTopicIndex(i => (i + 1) % floatingTopics.length), 2000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-0 overflow-hidden">
      {/* Background gradients — matches the purple/teal glow from screenshots */}
      <div className="absolute inset-0 bg-[#080D1A]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-1/3 w-72 h-72 bg-violet-800/15 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-700/60 bg-slate-800/40 backdrop-blur-sm text-slate-400 text-sm mb-8"
        >
          <Sparkles size={14} className="text-cyan-400" />
          Built on the Feynman Technique · New: Voice Teaching Mode
        </motion.div>

        {/* Floating topic pills */}
        <div className="absolute left-4 md:left-16 top-1/3 hidden md:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={topicIndex}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm text-slate-300 text-sm whitespace-nowrap"
            >
              <GraduationCap size={14} className="text-violet-400" />
              {floatingTopics[topicIndex % 2 === 0 ? topicIndex : (topicIndex + 2) % floatingTopics.length]}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute right-4 md:right-16 top-1/4 hidden md:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={topicIndex + 1}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm text-slate-300 text-sm whitespace-nowrap"
            >
              <Sparkles size={14} className="text-cyan-400" />
              {floatingTopics[(topicIndex + 3) % floatingTopics.length]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6"
        >
          If You Can't Teach It,{' '}
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
            You Don't Understand It.
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Teach concepts to an AI student that challenges your explanations,
          uncovers misconceptions, and helps you master any subject.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link
            to="/register"
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105"
          >
            Start Teaching
            <ArrowRight size={18} />
          </Link>
          <button className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all duration-200">
            <Play size={16} className="fill-current" />
            Watch Demo
          </button>
        </motion.div>

        {/* Animated Chat Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative mx-auto max-w-3xl"
        >
          {/* Window chrome */}
          <div className="bg-[#0D1426]/90 backdrop-blur-md border border-slate-700/60 rounded-t-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-3 text-slate-400 text-sm">
                  Teaching session · Binary Search Trees
                </span>
              </div>
              <span className="text-cyan-400 text-sm font-medium">Clarity 84%</span>
            </div>

            {/* Chat messages */}
            <div className="p-6 space-y-4 min-h-[200px]">
              <AnimatePresence>
                {chatMessages.slice(0, visibleMessages).map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'ai' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                        <GraduationCap size={14} className="text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white'
                          : 'bg-slate-800/80 text-slate-200 border border-slate-700/40'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.role === 'user' && (
                      <span className="text-slate-500 text-xs pt-2 flex-shrink-0">You</span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {visibleMessages > 0 && visibleMessages < chatMessages.length && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-cyan-400 text-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  AI student is asking a follow-up...
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default HeroSection