import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

const CTASection = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-24 bg-[#060B17]">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden p-16 text-center"
          style={{
            background: 'linear-gradient(135deg, #1a0533 0%, #0a1628 40%, #0d2040 70%, #0a1628 100%)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
          }}
        >
          {/* Glow effects */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="text-white">Stop Consuming. </span>
              <span className="text-cyan-400">Start</span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Teaching.
              </span>
            </h2>
            <p className="text-slate-400 text-lg mb-10">
              The fastest way to discover what you actually know.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105 text-lg"
            >
              Start Your First Teaching Session
              <ArrowRight size={20} />
            </Link>
            <p className="text-slate-600 text-sm mt-4">
              No credit card required · 2 min setup
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default CTASection