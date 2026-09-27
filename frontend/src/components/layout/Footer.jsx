import { Brain } from 'lucide-react'

// Columns kept as data so the markup stays one loop rather than four
// near-identical blocks.
const COLUMNS = [
  { heading: 'Product', links: ['Features', 'Docs', 'Changelog'] },
  { heading: 'Company', links: ['Blog', 'About', 'Careers', 'Contact'] },
  { heading: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
]

const Footer = () => {
  return (
    // This was written with inline styles and hard-coded hex, which meant it
    // could not follow the theme and was fixed at four columns on a phone.
    // Both are fixed by moving it onto the tokens and Tailwind's breakpoints.
    <footer className="border-t border-line bg-bg">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <Brain size={16} className="text-on-accent" />
              </div>
              <span className="text-ink font-serif font-semibold text-lg">
                Mentora <span className="text-accent">AI</span>
              </span>
            </div>
            <p className="text-muted text-sm leading-relaxed mb-6">
              Learn by teaching, not by re-reading.
            </p>
            <div className="flex gap-3">
              {['T', 'G', 'L'].map((letter) => (
                <a
                  key={letter}
                  href="#"
                  className="w-9 h-9 rounded-lg border border-line flex items-center justify-center
                             text-muted hover:text-accent hover:border-accent text-xs font-semibold
                             transition-colors duration-200"
                >
                  {letter}
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="text-ink font-semibold text-sm mb-4">{heading}</h4>
              <ul className="space-y-3">
                {links.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-muted hover:text-accent text-sm transition-colors duration-200"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-line flex flex-col sm:flex-row gap-2 sm:justify-between">
          <p className="text-muted text-sm">2026 Mentora AI. All rights reserved.</p>
          <p className="text-muted text-sm">Built for the curious.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
