import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'

// Only features that are actually planned in the project roadmap
const items = [
  'Unlimited teaching sessions',
  'Adaptive AI student persona',
  'Live misconception injection',
  'Session mastery report',
  'Concept gap analysis',
  'Voice teaching mode',
  'PDF notes upload',
  'Concept extraction from notes',
  'XP and streak tracking',
  'Badge system',
  'Session replay and insights',
]

const EverythingIncludedSection = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-24 bg-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-accent text-xs font-semibold tracking-widest uppercase mb-4"
          >
            PLATFORM
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-semibold text-ink"
          >
            Everything included
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-surface border border-line rounded-lg p-6 sm:p-10 text-center"
        >
          <p className="text-muted max-w-md mx-auto mb-8 leading-relaxed">
            Every feature available to every learner from day one. No paywalls, no tiers.
          </p>
          <Link
            to="/register"
            className="btn-primary inline-flex items-center mb-10"
          >
            Get started free
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4 text-left max-w-3xl mx-auto">
            {items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.3 + i * 0.04 }}
                className="flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-accent-soft border border-accent/40 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={12} className="text-accent" />
                </div>
                <span className="text-ink text-sm">{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default EverythingIncludedSection