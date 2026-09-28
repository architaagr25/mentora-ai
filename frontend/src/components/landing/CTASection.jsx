import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

const CTASection = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    // Page background, not surface-2: the tinted panel inside is accent-soft,
    // which sits only a shade off surface-2 and would have read as one flat
    // block instead of a panel.
    <section ref={ref} className="py-24 bg-bg">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative rounded-lg overflow-hidden border border-accent/30 bg-accent-soft p-10 md:p-16 text-center"
        >
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-semibold mb-4">
              <span className="text-ink">Stop Consuming. </span>
              <br />
              <span className="text-accent">Start Teaching.</span>
            </h2>
            <p className="text-muted text-lg mb-10">
              The fastest way to discover what you actually know.
            </p>
            <Link
              to="/register"
              className="btn-primary inline-flex items-center gap-2 text-lg"
            >
              Start Your First Teaching Session
              <ArrowRight size={20} />
            </Link>
            <p className="text-muted text-sm mt-4">
              No credit card required · 2 min setup
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default CTASection