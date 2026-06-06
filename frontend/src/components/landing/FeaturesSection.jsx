import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Bot, AlertTriangle, Network, Mic, TrendingUp, History } from 'lucide-react'

const features = [
  {
    icon: Bot,
    title: 'Adaptive AI Student',
    desc: 'An AI that adjusts its level — from curious freshman to skeptical professor.',
  },
  {
    icon: AlertTriangle,
    title: 'Misconception Detection',
    desc: "Catches subtly wrong reasoning the way a real teacher would.",
  },
  {
    icon: Network,
    title: 'Knowledge Gap Analysis',
    desc: 'Maps your understanding to a concept graph and shows the holes.',
  },
  {
    icon: Mic,
    title: 'Voice Teaching Mode',
    desc: 'Lecture out loud. We transcribe, score, and respond in real time.',
  },
  {
    icon: TrendingUp,
    title: 'Learning Progress Tracking',
    desc: 'Mastery scores per concept, week over week. Streaks included.',
  },
  {
    icon: History,
    title: 'Session Replay & Insights',
    desc: 'Rewind any session. See exactly where your explanation broke down.',
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
            className="text-4xl md:text-5xl font-bold text-white"
          >
            Everything you need to teach
            <br />your way to mastery
          </motion.h2>
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