import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Flame, BookOpen, TrendingUp, Target } from 'lucide-react'

// This panel is a preview of the real dashboard, so it shows what the real
// dashboard shows. One point per day you were scored — not one per day on
// the calendar — because that is what computeScoreTrend produces.
const RANGES = ['7D', '30D', 'All']
const TRENDS = {
  '7D': {
    delta: 6,
    points: [
      { day: 'Sep 24', mastery: 81 },
      { day: 'Sep 26', mastery: 84 },
      { day: 'Sep 29', mastery: 87 },
    ],
  },
  '30D': {
    delta: 37,
    points: [
      { day: 'Sep 2', mastery: 50 },
      { day: 'Sep 7', mastery: 56 },
      { day: 'Sep 13', mastery: 61 },
      { day: 'Sep 18', mastery: 70 },
      { day: 'Sep 24', mastery: 81 },
      { day: 'Sep 29', mastery: 87 },
    ],
  },
  All: {
    delta: 47,
    points: [
      { day: 'Jun 3', mastery: 40 },
      { day: 'Jul 11', mastery: 44 },
      { day: 'Aug 2', mastery: 47 },
      { day: 'Sep 2', mastery: 50 },
      { day: 'Sep 13', mastery: 61 },
      { day: 'Sep 24', mastery: 81 },
      { day: 'Sep 29', mastery: 87 },
    ],
  },
}

// Focus Areas on the real dashboard keeps only topics averaging under 80%
// completeness, weakest first, and shows at most four. A topic you have
// nailed is exactly what it leaves out.
const focusAreas = [
  { topic: 'DNA Replication', completeness: 48 },
  { topic: "Bayes' Theorem", completeness: 61 },
  { topic: 'Eigenvectors', completeness: 68 },
  { topic: 'B-Trees', completeness: 74 },
]

const DashboardSection = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [rangeKey, setRangeKey] = useState('30D')
  const trend = TRENDS[rangeKey]
  const latest = trend.points[trend.points.length - 1].mastery

  return (
    <section ref={ref} className="py-24 bg-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
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
            className="text-3xl sm:text-4xl md:text-5xl font-semibold text-ink mb-4"
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
          className="bg-surface border border-line rounded-lg p-4 sm:p-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2 bg-bg rounded-lg p-4 sm:p-5 border border-line">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-muted text-sm">
                    Mastery · {rangeKey === 'All' ? 'all time' : `last ${rangeKey === '7D' ? 7 : 30} days`}
                  </p>
                  <p className="text-accent text-2xl font-semibold">
                    {latest}%{' '}
                    <span className="text-success text-sm font-medium">↑ {trend.delta} pts</span>
                  </p>
                </div>
                {/* These were three dead buttons in a product demo. They now
                    do what the real toggle does. */}
                <div className="flex gap-1" role="group" aria-label="Date range">
                  {RANGES.map((key) => (
                    <button
                      key={key}
                      onClick={() => setRangeKey(key)}
                      aria-pressed={key === rangeKey}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        key === rangeKey
                          ? 'bg-accent text-on-accent'
                          : 'text-muted hover:text-ink hover:bg-surface-2'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trend.points} margin={{ top: 4, right: 28, bottom: 0, left: 4 }}>
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
                    tickMargin={10}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 50, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                  />
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
                    dataKey="mastery"
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
                  icon: BookOpen,
                  color: 'bg-accent-soft text-accent',
                  label: 'Sessions This Week',
                  value: '4',
                },
                {
                  icon: TrendingUp,
                  color: 'bg-accent-soft text-accent',
                  label: 'Avg Mastery Score',
                  value: '87%',
                },
                {
                  icon: Target,
                  color: 'bg-accent-soft text-accent',
                  label: 'Total Sessions',
                  value: '23',
                },
                {
                  icon: Flame,
                  color: 'bg-highlight-soft text-highlight',
                  label: 'Current Streak',
                  value: '14 days',
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
                  <Target size={12} className="text-accent" />
                </div>
                <span className="text-ink font-semibold text-sm">Focus areas</span>
              </div>
              <p className="text-muted text-xs mb-5">Topics under 80% completeness</p>
              <div className="space-y-4">
                {focusAreas.map((area, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-ink">{area.topic}</span>
                      <span className="text-muted">{area.completeness}%</span>
                    </div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={isInView ? { width: `${area.completeness}%` } : {}}
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