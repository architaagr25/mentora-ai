import { Link } from 'react-router-dom'
import { Brain, ExternalLink } from 'lucide-react'

// Every link here goes somewhere real. The previous version had eleven
// href="#" placeholders — Docs, Changelog, Blog, Careers, Privacy, Terms and
// the rest — plus three social buttons labelled "T", "G" and "L" that led
// nowhere. A footer advertising a careers page this project does not have
// reads worse than a short, honest one.
const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'See a session', href: '#demo' },
    ],
  },
  {
    heading: 'Get started',
    links: [
      { label: 'Create an account', to: '/register' },
      { label: 'Sign in', to: '/login' },
    ],
  },
]

const REPO_URL = 'https://github.com/architaagr25/mentora-ai'

const Footer = () => {
  return (
    // This was written with inline styles and hard-coded hex, which meant it
    // could not follow the theme and was fixed at four columns on a phone.
    // Both are fixed by moving it onto the tokens and Tailwind's breakpoints.
    <footer className="border-t border-line bg-bg">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <Brain size={16} className="text-on-accent" />
              </div>
              <span className="text-ink font-serif font-semibold text-lg">
                Mentora <span className="text-accent">AI</span>
              </span>
            </div>
            <p className="text-muted text-sm leading-relaxed mb-6 max-w-xs">
              Learn by teaching, not by re-reading.
            </p>
            {/* Named in full, rather than the three bare letters that used
                to sit here without saying which service they meant. */}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-line
                         text-muted hover:text-accent hover:border-accent text-sm
                         transition-colors duration-200"
            >
              Source on GitHub
              <ExternalLink size={14} />
            </a>
          </div>

          {COLUMNS.map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="text-ink font-semibold text-sm mb-4">{heading}</h4>
              <ul className="space-y-3">
                {links.map(({ label, to, href }) => (
                  <li key={label}>
                    {href ? (
                      <a
                        href={href}
                        className="text-muted hover:text-accent text-sm transition-colors duration-200"
                      >
                        {label}
                      </a>
                    ) : (
                      <Link
                        to={to}
                        className="text-muted hover:text-accent text-sm transition-colors duration-200"
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-line flex flex-col sm:flex-row gap-2 sm:justify-between">
          <p className="text-muted text-sm">© 2026 Mentora AI. All rights reserved.</p>
          <p className="text-muted text-sm">Built for the curious.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
