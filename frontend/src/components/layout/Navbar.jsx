import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, Brain } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setIsMobileOpen(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`w-full max-w-6xl flex items-center justify-between px-6 py-3 rounded-2xl border transition-all duration-300 ${
          isScrolled
            ? 'bg-[#0D1426]/95 backdrop-blur-md border-slate-700/60 shadow-xl'
            : 'bg-[#0D1426]/80 backdrop-blur-sm border-slate-700/40'
        }`}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
            <Brain size={16} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg">
            Mentora <span className="text-cyan-400">AI</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {['features', 'how-it-works', 'demo'].map((item) => (
            <button
              key={item}
              onClick={() => scrollTo(item)}
              className="text-slate-400 hover:text-white text-sm font-medium capitalize transition-colors duration-200"
            >
              {item === 'how-it-works' ? 'How it works' : item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/login"
            className="text-slate-400 hover:text-white text-sm font-medium transition-colors duration-200"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/25"
          >
            Get started
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-slate-400 hover:text-white transition-colors"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </motion.div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-4 right-4 bg-[#0D1426]/98 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 flex flex-col gap-4"
          >
            {['features', 'how-it-works', 'demo'].map((item) => (
              <button
                key={item}
                onClick={() => scrollTo(item)}
                className="text-slate-300 hover:text-white text-sm font-medium text-left capitalize transition-colors"
              >
                {item === 'how-it-works' ? 'How it works' : item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
            <hr className="border-slate-700" />
            <Link to="/login" className="text-slate-300 text-sm font-medium">Sign in</Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white text-center bg-gradient-to-r from-violet-600 to-cyan-500"
            >
              Get started
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

export default Navbar