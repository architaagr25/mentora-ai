import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { BookOpen, MessageSquare, ClipboardList } from 'lucide-react'

const steps = [
  {
    icon: BookOpen,
    step: 'STEP 01',
    title: 'Choose a topic',
    desc: 'Pick any concept you think you understand. Works best with things you\'ve studied but never had to explain out loud.',
  },
  {
    icon: MessageSquare,
    step: 'STEP 02',
    title: 'Teach the AI student',
    desc: 'Explain it like you\'re teaching someone who just can\'t quite get it. The AI asks the questions a confused person would actually ask, the ones that expose where your explanation has holes.',
  },
  {
    icon: ClipboardList,
    step: 'STEP 03',
    title: 'Get your mastery report',
    desc: 'Get a scored breakdown of your explanation - what you got right, where you were vague, and what to revisit before your next session.',
  },
]

const HowItWorksSection = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="how-it-works" ref={ref} className="py-24 bg-bg">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-accent text-xs font-semibold tracking-widest uppercase mb-4"
          >
            HOW IT WORKS
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-semibold text-ink mb-4"
          >
            Three steps.{' '}
            <span className="text-accent">One uncomfortable truth.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="text-muted text-lg max-w-xl mx-auto"
          >
            The loop is simple. What it reveals about your understanding isn't always comfortable.
          </motion.p>
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Connecting line on desktop */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-px bg-line" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative bg-surface border border-line rounded-lg p-8 hover:border-accent transition-all duration-300 group"
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-lg bg-accent-soft border border-accent/30 flex items-center justify-center mb-6">
                <step.icon size={24} className="text-accent" />
              </div>

              <p className="text-muted text-xs font-semibold tracking-widest mb-3">{step.step}</p>
              <h3 className="text-ink text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection