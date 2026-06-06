import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const testimonials = [
  {
    quote: "I thought I understood transformers. Three teaching sessions later, I realized I was hand-waving over attention masking. Game changer.",
    name: "Anya Patel",
    role: "ML Engineer",
    initials: "AP",
    color: "from-violet-600 to-cyan-500",
  },
  {
    quote: "Med school is memorization hell. Teaching the AI student forced me to actually understand pharmacology pathways instead of flashcarding them.",
    name: "Marcus Chen",
    role: "MS3, Johns Hopkins",
    initials: "MC",
    color: "from-cyan-600 to-blue-500",
  },
  {
    quote: "Used it to prep for system design interviews. The AI's misconception prompts caught things even my study group missed.",
    name: "Priya Singh",
    role: "Software Engineer, Stripe",
    initials: "PS",
    color: "from-violet-500 to-pink-500",
  },
  {
    quote: "Cleared UPSC prelims after using Mentora daily for 4 months. The mastery report told me exactly where to focus.",
    name: "Rohan Kapoor",
    role: "Civil Services Aspirant",
    initials: "RK",
    color: "from-orange-500 to-red-500",
  },
  {
    quote: "It's like having a Socratic tutor on demand. My students at the bootcamp use it nightly.",
    name: "Elena Vasquez",
    role: "Lead Instructor, Lambda",
    initials: "EV",
    color: "from-green-600 to-cyan-500",
  },
  {
    quote: "Finally a tool that doesn't just hand me answers. It makes me earn understanding.",
    name: "James O'Connor",
    role: "PhD Candidate, Caltech",
    initials: "JO",
    color: "from-blue-600 to-violet-500",
  },
]

const TestimonialsSection = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-24 bg-[#060B17]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-4"
          >
            LOVED BY LEARNERS
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white"
          >
            What people are teaching
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-[#0D1426] border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300"
            >
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-slate-500 text-xs">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TestimonialsSection