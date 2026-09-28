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
    <section ref={ref} className="py-24 bg-bg">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-accent text-xs font-semibold tracking-widest uppercase mb-4"
          >
            PRODUCT
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-semibold text-ink mb-4"
          >
            A dashboard that actually
            <br />shows what you know
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="text-muted max-w-xl mx-auto"
          >
            Mastery scores, weak areas, streaks, and a live knowledge graph — all in one calm interface.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-surface border border-line rounded-lg p-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2 bg-bg rounded-lg p-5 border border-line">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-muted text-sm">Weekly clarity</p>
                  <p className="text-accent text-2xl font-semibold">
                    +38% <span className="text-success text-sm">↑</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  {['7D', '30D', 'All'].map((t, i) => (
                    <button
                      key={t}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        i === 0
                          ? 'bg-accent text-on-accent'
                          : 'text-muted hover:text-ink'
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
                      <stop offset="5%" stopColor="rgb(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="rgb(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fill: 'rgb(var(--muted))', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: 'rgb(var(--surface))',
                      border: '1px solid rgb(var(--line))',
                      borderRadius: '8px',
                      color: 'rgb(var(--ink))',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="rgb(var(--accent))"
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
                  color: 'bg-highlight-soft text-highlight',
                  label: 'Current streak',
                  value: '14 days',
                },
                {
                  icon: Calendar,
                  color: 'bg-accent-soft text-accent',
                  label: 'Sessions this week',
                  value: '11',
                },
                {
                  icon: TrendingUp,
                  color: 'bg-accent-soft text-accent',
                  label: 'Avg. accuracy',
                  value: '86%',
                },
              ].map(({ icon: Icon, color, label, value }, i) => (
                <div
                  key={i}
                  className="bg-bg border border-line rounded-lg p-4 flex items-center gap-4"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-muted text-xs">{label}</p>
                    <p className="text-ink font-semibold text-lg">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Concept mastery + knowledge graph */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 bg-bg border border-line rounded-lg p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-md bg-accent-soft flex items-center justify-center">
                  <Network size={12} className="text-accent" />
                </div>
                <span className="text-ink font-semibold text-sm">Concept mastery</span>
              </div>
              <div className="space-y-4">
                {concepts.map((c, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-ink">{c.name}</span>
                      <span className="text-muted">{c.score}%</span>
                    </div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={isInView ? { width: `${c.score}%` } : {}}
                        transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                        className="h-full rounded-full bg-accent"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Knowledge graph */}
            <div className="bg-bg border border-line rounded-lg p-5">
              <p className="text-ink font-semibold text-sm mb-4">Knowledge graph</p>
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
                    stroke="rgb(var(--line))"
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
                    fill="rgb(var(--surface-2))"
                    stroke="rgb(var(--accent))"
                    strokeWidth="1.5"
                  />
                ))}
                <circle cx="100" cy="80" r="14" fill="rgb(var(--accent))" opacity="0.35" />
                <circle cx="100" cy="80" r="10" fill="rgb(var(--accent))" />
              </svg>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default DashboardSection