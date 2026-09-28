import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Sparkles, GraduationCap } from 'lucide-react'
import StudentAvatar from '@/components/StudentAvatar'

const floatingTopics = [
  'Binary Search Trees', 'The TCP Handshake', 'Bayes Theorem',
  'How DNS works', 'React useEffect', 'System Design basics',
  'CAP Theorem', 'Big O Notation',
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

  // CHAT ANIMATION: Runs exactly once and stops at the end
  useEffect(() => {
    if (visibleMessages >= chatMessages.length) return; // Stop the loop here

    const timer = setTimeout(() => {
      setVisibleMessages(v => v + 1)
    }, visibleMessages === 0 ? 1000 : 2500)

    return () => clearTimeout(timer)
  }, [visibleMessages])

  // Floating topics interval
  useEffect(() => {
    const timer = setInterval(() => setTopicIndex(i => (i + 1) % floatingTopics.length), 2000)
    return () => clearInterval(timer)
  }, [])

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-0 overflow-hidden bg-bg">
      {/* The three blurred colour blobs that used to sit here are gone. They
          were the loudest thing on the page and said nothing; the headline and
          the live chat preview carry it on their own. */}

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-line bg-surface-2 text-muted text-sm mb-8"
        >
          <Sparkles size={14} className="text-accent" />
          Based on the Feynman Technique — explain it or you don't know it
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-surface text-muted text-sm whitespace-nowrap"
            >
              <GraduationCap size={14} className="text-accent" />
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-surface text-muted text-sm whitespace-nowrap"
            >
              <Sparkles size={14} className="text-accent" />
              {floatingTopics[(topicIndex + 3) % floatingTopics.length]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Main headline. The second line carries the accent as flat colour —
            a gradient across the words made the sentence harder to read than
            the sentence deserved. */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-semibold text-ink leading-tight mb-6"
        >
          If You Can't Teach It,{' '}
          <br />
          <span className="text-accent">You Don't Understand It.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Most students re-read notes and feel ready.
          Mentora makes you explain, in your own words,
          to an AI that asks exactly the questions you can't answer.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link to="/register" className="btn-primary flex items-center gap-2">
            Try a Session
            <ArrowRight size={18} />
          </Link>
          <button onClick={scrollToHowItWorks} className="btn-secondary">
            See how it works
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
          <div className="bg-surface border border-line rounded-t-lg text-left">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-line">
              <div className="flex items-center gap-2">
                {/* Neutral dots. Red/amber/green here would spend three
                    semantic colours on decoration that means nothing. */}
                <div className="w-3 h-3 rounded-full bg-line" />
                <div className="w-3 h-3 rounded-full bg-line" />
                <div className="w-3 h-3 rounded-full bg-line" />
                <span className="ml-3 text-muted text-sm">
                  Session in progress · Binary Search Trees
                </span>
              </div>
              <span className="text-success text-sm font-medium">Clarity score · 84%</span>
            </div>

            {/* Chat messages */}
            <div className="p-4 sm:p-6 space-y-4 min-h-[200px]">
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
                      <StudentAvatar />
                    )}
                    <div
                      className={`max-w-md px-4 py-3 rounded-lg text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-surface-2 text-ink'
                          : 'bg-bg text-ink border border-line'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.role === 'user' && (
                      <span className="text-muted text-xs pt-2 flex-shrink-0">You</span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {visibleMessages > 0 && visibleMessages < chatMessages.length && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-accent text-sm"
                >
                  {/* One of the few places a pulse is earned: something is
                      actually happening while it shows. */}
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  AI student is thinking...
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
