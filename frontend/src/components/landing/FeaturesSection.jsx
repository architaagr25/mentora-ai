import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Bot, AlertTriangle, Network, Mic, TrendingUp, History } from 'lucide-react'

const features = [
  {
    icon: Bot,
    title: 'Adaptive AI Student',
    desc: 'Plays the role of a confused student who genuinely does not get it. Asks follow-ups. Pushes back. Does not let you hand-wave through the hard parts.',
  },
  {
    icon: AlertTriangle,
    title: 'Misconception Detection',
    desc: 'Flags when your explanation contains something technically off. Not to embarrass you, but because that is where the real learning happens.',
  },
  {
    icon: Network,
    title: 'Knowledge Gap Analysis',
    desc: 'After each session your concept map gets updated. Over time you can see which topics you keep avoiding and which ones you have genuinely nailed.',
  },
  {
    icon: Mic,
    title: 'Voice Teaching Mode',
    desc: 'Prefer thinking out loud? Talk through your explanation and Mentora transcribes it. Useful when typing feels slower than your thoughts.',
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    desc: 'Every session scores your explanation on accuracy, clarity and completeness. Watch your scores improve as you revisit the same concepts over time.',
  },
  {
    icon: History,
    title: 'Session Replay',
    desc: 'Go back through any past session transcript. Useful for spotting patterns. The questions you always struggle to answer reveal the most.',
  },
]

const FeaturesSection = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="features" ref={ref} className="py-24 bg-[#060B17]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-4"
          >
            FEATURES
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Built around one idea
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg max-w-xl mx-auto"
          >
            Six features that make the gap between 'I think I know this' and 'I actually know this' impossible to ignore.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-[#0D1426] border border-slate-800 rounded-2xl p-7 hover:border-cyan-500/30 hover:bg-[#0D1426]/80 transition-all duration-300 group cursor-default"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5 group-hover:bg-cyan-500/20 transition-colors duration-300">
                <feature.icon size={20} className="text-cyan-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection