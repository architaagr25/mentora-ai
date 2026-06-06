import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const stats = [
  { value: '2.4M+', label: 'Concepts Mastered' },
  { value: '850K', label: 'Teaching Sessions' },
  { value: '+38%', label: 'Avg. Recall Improvement' },
  { value: '120K', label: 'Active Learners' },
]

const StatsSection = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-16 bg-[#080D1A] border-t border-slate-800/60">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-slate-500 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Trusted by */}
        <div className="mt-16 text-center">
          <p className="text-slate-600 text-xs tracking-widest uppercase mb-8">
            Trusted by learners from
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {['Stanford', 'MIT', 'Y Combinator', 'Caltech', 'Khan Academy', 'ETH Zürich'].map((name) => (
              <span key={name} className="text-slate-500 hover:text-slate-300 font-medium text-lg transition-colors duration-200 cursor-default">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default StatsSection