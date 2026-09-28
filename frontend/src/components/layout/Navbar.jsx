import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, Brain } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ThemeToggle from './ThemeToggle'
import useHideOnScroll from '@/hooks/useHideOnScroll'

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // The bar gets out of the way going down and comes back the moment you
  // move up, so the nav is always one small gesture away.
  const { visible } = useHideOnScroll({
    onScroll: (y) => setIsScrolled(y > 20),
  })

  // An open menu must not scroll away with the bar that owns it.
  const isHidden = !visible && !isMobileOpen

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setIsMobileOpen(false)
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4
                  transition-transform duration-300 ${
                    isHidden ? '-translate-y-[130%]' : 'translate-y-0'
                  }`}
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        // Scrolling only firms the bar up — a border and a shadow appear so it
        // separates from the content passing under it. The surface stays
        // translucent either way so the page still reads as continuous.
        className={`w-full max-w-6xl flex items-center justify-between px-6 py-3 rounded-lg border transition-all duration-300 ${
          isScrolled
            ? 'bg-surface/95 backdrop-blur-md border-line shadow-md'
            : 'bg-surface/80 backdrop-blur-sm border-line/60'
        }`}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Brain size={16} className="text-on-accent" />
          </div>
          <span className="text-ink font-serif font-semibold text-lg">
            Mentora <span className="text-accent">AI</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {['features', 'how-it-works', 'demo'].map((item) => (
            <button
              key={item}
              onClick={() => scrollTo(item)}
              className="text-muted hover:text-ink text-sm font-medium capitalize transition-colors duration-200"
            >
              {item === 'how-it-works' ? 'How it works' : item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/login"
            className="text-muted hover:text-ink text-sm font-medium transition-colors duration-200"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-on-accent bg-accent hover:bg-accent-hover transition-colors duration-200"
          >
            Get started
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button
            className="p-2 text-muted hover:text-ink transition-colors"
            aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileOpen}
            onClick={() => setIsMobileOpen(!isMobileOpen)}
          >
            {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-4 right-4 bg-surface border border-line rounded-lg p-6 flex flex-col gap-4 shadow-lg"
          >
            {['features', 'how-it-works', 'demo'].map((item) => (
              <button
                key={item}
                onClick={() => scrollTo(item)}
                className="text-ink hover:text-accent text-sm font-medium text-left capitalize transition-colors"
              >
                {item === 'how-it-works' ? 'How it works' : item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
            <hr className="border-line" />
            <Link to="/login" className="text-ink text-sm font-medium">Sign in</Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-on-accent text-center bg-accent hover:bg-accent-hover transition-colors"
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
