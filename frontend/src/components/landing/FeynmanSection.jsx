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
    <section ref={ref} className="py-24 bg-[#060B17]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left - Concentric circle diagram */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="bg-[#0D1426] border border-slate-800 rounded-2xl p-8 flex items-center justify-center aspect-square max-w-md mx-auto w-full"
          >
            <div className="relative w-64 h-64">
              <svg viewBox="0 0 260 260" className="w-full h-full">
                {/* Concentric circles */}
                <circle cx="130" cy="130" r="120" fill="none" stroke="#1E293B" strokeWidth="1" />
                <circle cx="130" cy="130" r="85" fill="none" stroke="#1E293B" strokeWidth="1" />
                <circle cx="130" cy="130" r="50" fill="none" stroke="#1E293B" strokeWidth="1" />
                {/* Center YOU */}
                <circle cx="130" cy="130" r="28" fill="#7C3AED" opacity="0.9" />
                <text x="130" y="135" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">YOU</text>
                {/* Outer nodes */}
                <circle cx="130" cy="15" r="10" fill="#0D1426" stroke="#7C3AED" strokeWidth="1.5" />
                <circle cx="245" cy="130" r="10" fill="#0D1426" stroke="#7C3AED" strokeWidth="1.5" />
                <circle cx="130" cy="245" r="10" fill="#0D1426" stroke="#7C3AED" strokeWidth="1.5" />
                <circle cx="15" cy="130" r="10" fill="#0D1426" stroke="#7C3AED" strokeWidth="1.5" />
                {/* Labels */}
                <text x="130" y="8" textAnchor="middle" fill="#94A3B8" fontSize="10">Pick a topic</text>
                <text x="252" y="133" textAnchor="start" fill="#94A3B8" fontSize="10">Teach it</text>
                <text x="130" y="262" textAnchor="middle" fill="#94A3B8" fontSize="10">Find gaps</text>
                <text x="3" y="133" textAnchor="start" fill="#94A3B8" fontSize="10">Simplify</text>
              </svg>
            </div>
          </motion.div>

          {/* Right - Text content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-4">
              THE FEYNMAN TECHNIQUE
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Why teaching beats studying
            </h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
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
                  <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 size={14} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold mb-1">{b.title}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{b.desc}</p>
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