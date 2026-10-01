import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

const benefits = [
  { title: 'Exposes false understanding', desc: 'Surface-level recall collapses the moment you have to explain it out loud.' },
  { title: 'Strengthens memory retention', desc: 'Active recall + generation effect — proven to outperform re-reading by 2–3×.' },
  { title: 'Improves long-term recall', desc: 'Spaced teaching prompts move concepts from working memory to durable knowledge.' },
  { title: 'Builds deeper comprehension', desc: 'You stop memorizing patterns and start understanding causal structure.' },
]

const FeynmanSection = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-24 bg-surface-2">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left - Concentric circle diagram */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="bg-surface border border-line rounded-lg p-5 sm:p-8 max-w-md mx-auto w-full"
          >
            <p className="text-accent text-xs font-semibold tracking-widest uppercase mb-2">
              THE LOOP
            </p>
            <h3 className="text-ink font-semibold mb-1">Four steps, then round again</h3>
            <p className="text-muted text-sm">
              One pass is one teaching session. The gaps you find on the way
              are what you simplify before the next one.
            </p>
            <div className="relative w-full aspect-square">
              <svg viewBox="-52 -52 364 364" className="w-full h-full">
                {/* Concentric circles */}
                <circle cx="130" cy="130" r="120" fill="none" stroke="rgb(var(--line))" strokeWidth="1" />
                <circle cx="130" cy="130" r="85" fill="none" stroke="rgb(var(--line))" strokeWidth="1" />
                <circle cx="130" cy="130" r="50" fill="none" stroke="rgb(var(--line))" strokeWidth="1" />
                {/* Center YOU */}
                <circle cx="130" cy="130" r="28" fill="rgb(var(--accent))" />
                <text x="130" y="135" textAnchor="middle" fill="rgb(var(--on-accent))" fontSize="12" fontWeight="600">YOU</text>
                {/* Outer nodes */}
                <circle cx="130" cy="15" r="10" fill="rgb(var(--surface))" stroke="rgb(var(--accent))" strokeWidth="1.5" />
                <circle cx="245" cy="130" r="10" fill="rgb(var(--surface))" stroke="rgb(var(--accent))" strokeWidth="1.5" />
                <circle cx="130" cy="245" r="10" fill="rgb(var(--surface))" stroke="rgb(var(--accent))" strokeWidth="1.5" />
                <circle cx="15" cy="130" r="10" fill="rgb(var(--surface))" stroke="rgb(var(--accent))" strokeWidth="1.5" />
                {/* Labels sit outside their node, anchored away from the
                    centre so none of them runs back over the diagram. */}
                <text x="130" y="-7" textAnchor="middle" fill="rgb(var(--muted))" fontSize="12">Pick a topic</text>
                <text x="263" y="134" textAnchor="start" fill="rgb(var(--muted))" fontSize="12">Teach it</text>
                <text x="130" y="275" textAnchor="middle" fill="rgb(var(--muted))" fontSize="12">Find gaps</text>
                <text x="-3" y="134" textAnchor="end" fill="rgb(var(--muted))" fontSize="12">Simplify</text>
              </svg>
            </div>
          </motion.div>

          {/* Right - Text content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-accent text-xs font-semibold tracking-widest uppercase mb-4">
              THE FEYNMAN TECHNIQUE
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-ink mb-6">
              Why teaching beats studying
            </h2>
            <p className="text-muted mb-8 leading-relaxed">
              Richard Feynman's insight: the act of explaining forces the brain to confront its gaps. We made it interactive.
            </p>
            <div className="space-y-6">
              {benefits.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-6 h-6 rounded-full bg-accent-soft border border-accent/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 size={14} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-ink font-semibold mb-1">{b.title}</p>
                    <p className="text-muted text-sm leading-relaxed">{b.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default FeynmanSection