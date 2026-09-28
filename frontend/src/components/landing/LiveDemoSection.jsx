import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import StudentAvatar from '@/components/StudentAvatar'

const scores = [
  { label: 'Accuracy', value: 9, max: 10 },
  { label: 'Clarity', value: 8, max: 10 },
  { label: 'Completeness', value: 7, max: 10 },
]

const gaps = [
  'Did not explain why sequence numbers are needed',
  'Skipped what happens if the final ACK is lost',
  'Vague on why the handshake needs three steps not two',
]

const demoMessages = [
  { role: 'user', text: 'The TCP handshake is three steps: client sends SYN, server replies with SYN-ACK, client sends ACK. Then the connection is open.' },
  { role: 'ai', text: 'So the client sends SYN. Why can\'t the server immediately send ACK instead of SYN-ACK? What would be missing from that connection?' },
  { role: 'user', text: 'Because... the server also needs to confirm its own sequence number with the client.' },
]

const LiveDemoSection = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="demo" ref={ref} className="py-24 bg-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-accent text-xs font-semibold tracking-widest uppercase mb-4"
          >
            PREVIEW
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-semibold text-ink mb-4"
          >
            What a session actually looks like
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="text-muted text-lg max-w-xl mx-auto"
          >
            A sample session on TCP handshake. The AI student keeps asking until your explanation has no holes left in it.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Chat — 3/5 */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-3 bg-surface border border-line rounded-lg overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <span className="text-muted text-sm">
                Topic · <span className="text-ink font-medium">TCP Handshake</span>
              </span>
              <span className="text-muted text-sm">Sample session</span>
            </div>
            <div className="p-6 space-y-4">
              {demoMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.4 + i * 0.15 }}
                  className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'ai' && (
                    <StudentAvatar />
                  )}
                  <div
                    className={`max-w-sm px-4 py-3 rounded-lg text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-surface-2 text-ink'
                        : 'bg-bg text-ink border border-line'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.role === 'user' && (
                    <span className="text-muted text-xs pt-2 flex-shrink-0">You</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Scores — 2/5 */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-2 flex flex-col gap-4"
          >
            {/* Session scores */}
            <div className="bg-surface border border-line rounded-lg p-4 sm:p-6">
              <p className="text-ink font-semibold mb-1">Session scores</p>
              <p className="text-muted text-xs mb-5">Calculated at session end</p>
              <div className="space-y-4">
                {scores.map((s, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-ink">{s.label}</span>
                      <span className="text-ink font-medium">{s.value}/{s.max}</span>
                    </div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={isInView ? { width: `${(s.value / s.max) * 100}%` } : {}}
                        transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
                        className="h-full rounded-full bg-accent"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detected gaps */}
            <div className="bg-surface border border-line rounded-lg p-4 sm:p-6">
              <p className="text-ink font-semibold mb-4">Gaps found</p>
              <div className="space-y-3">
                {gaps.map((gap, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-highlight mt-1.5 flex-shrink-0" />
                    <span className="text-muted text-sm">{gap}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default LiveDemoSection