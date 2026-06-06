import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Flame, Calendar, TrendingUp, Network } from 'lucide-react'

const chartData = [
  { day: 'Tue', value: 45 },
  { day: 'Wed', value: 52 },
  { day: 'Thu', value: 49 },
  { day: 'Fri', value: 61 },
  { day: 'Sat', value: 68 },
  { day: 'Sun', value: 78 },
]

const concepts = [
  { name: 'TCP Handshake', score: 92 },
  { name: 'Eigenvectors', score: 78 },
  { name: 'DNA Replication', score: 64 },
  { name: 'B-Trees', score: 88 },
  { name: "Bayes' Theorem", score: 71 },
]

const DashboardSection = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-24 bg-[#080D1A]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-4"
          >
            PRODUCT
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            A dashboard that actually
            <br />shows what you know
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="text-slate-400 max-w-xl mx-auto"
          >
            Mastery scores, weak areas, streaks, and a live knowledge graph — all in one calm interface.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-[#0D1426] border border-slate-800 rounded-2xl p-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2 bg-[#080D1A] rounded-xl p-5 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-slate-500 text-sm">Weekly clarity</p>
                  <p className="text-cyan-400 text-2xl font-bold">
                    +38% <span className="text-green-400 text-sm">↑</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  {['7D', '30D', 'All'].map((t, i) => (
                    <button
                      key={t}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        i === 0
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="clarityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fill: '#475569', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: '#0D1426',
                      border: '1px solid #1E293B',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    fill="url(#clarityGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Stats sidebar */}
            <div className="flex flex-col gap-4">
              {[
                {
                  icon: Flame,
                  color: 'bg-orange-500/20 text-orange-400',
                  label: 'Current streak',
                  value: '14 days',
                },
                {
                  icon: Calendar,
                  color: 'bg-blue-500/20 text-blue-400',
                  label: 'Sessions this week',
                  value: '11',
                },
                {
                  icon: TrendingUp,
                  color: 'bg-violet-500/20 text-violet-400',
                  label: 'Avg. accuracy',
                  value: '86%',
                },
              ].map(({ icon: Icon, color, label, value }, i) => (
                <div
                  key={i}
                  className="bg-[#080D1A] border border-slate-800 rounded-xl p-4 flex items-center gap-4"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">{label}</p>
                    <p className="text-white font-bold text-lg">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Concept mastery + knowledge graph */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 bg-[#080D1A] border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-md bg-violet-600/30 flex items-center justify-center">
                  <Network size={12} className="text-violet-400" />
                </div>
                <span className="text-white font-semibold text-sm">Concept mastery</span>
              </div>
              <div className="space-y-4">
                {concepts.map((c, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{c.name}</span>
                      <span className="text-slate-400">{c.score}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={isInView ? { width: `${c.score}%` } : {}}
                        transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Knowledge graph */}
            <div className="bg-[#080D1A] border border-slate-800 rounded-xl p-5">
              <p className="text-white font-semibold text-sm mb-4">Knowledge graph</p>
              <svg viewBox="0 0 200 160" className="w-full">
                {[
                  [100, 80, 100, 20],
                  [100, 80, 160, 60],
                  [100, 80, 140, 130],
                  [100, 80, 60, 130],
                  [100, 80, 40, 60],
                ].map(([x1, y1, x2, y2], i) => (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#334155"
                    strokeWidth="1.5"
                  />
                ))}
                {[
                  [100, 20],
                  [160, 60],
                  [140, 130],
                  [60, 130],
                  [40, 60],
                ].map(([cx, cy], i) => (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r="8"
                    fill="#1E293B"
                    stroke="#7C3AED"
                    strokeWidth="1.5"
                  />
                ))}
                <circle cx="100" cy="80" r="14" fill="#7C3AED" opacity="0.9" />
                <circle cx="100" cy="80" r="10" fill="#8B5CF6" />
              </svg>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default DashboardSection