import { Link } from 'react-router-dom'
import { Brain, Twitter, Github, Linkedin } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="border-t border-slate-800 bg-[#080D1A]">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                <Brain size={16} className="text-white" />
              </div>
              <span className="text-white font-semibold text-lg">
                Mentora <span className="text-cyan-400">AI</span>
              </span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Learn by teaching. AI finds what you don't truly understand.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: Twitter, href: '#' },
                { icon: Github, href: '#' },
                { icon: Linkedin, href: '#' },
              ].map(({ icon: Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-9 h-9 rounded-lg border border-slate-700 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-500 transition-all duration-200"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-3">
              {['Features', 'Docs', 'Changelog'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-200">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-3">
              {['Blog', 'About', 'Careers', 'Contact'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-200">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-3">
              {['Privacy', 'Terms', 'Security', 'Cookies'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-200">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-sm">© 2026 Mentora AI. All rights reserved.</p>
          <p className="text-slate-600 text-sm">Built for the curious.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer