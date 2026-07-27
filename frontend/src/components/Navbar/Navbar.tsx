import { memo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Shield } from 'lucide-react'
import { useScrollY } from '../../hooks/useScrollY'
import Button from '../Shared/Button'

const NAV_LINKS = [
  { label: 'Platform', href: '/', active: true },
  { label: 'Fleet Solutions', href: '#fleet' },
  { label: 'Safety Research', href: '#research' },
  { label: 'Safety Insights', href: '#insights' },
]

const Navbar = memo(function Navbar() {
  const scrollY = useScrollY()
  const [mobileOpen, setMobileOpen] = useState(false)
  const scrolled = scrollY > 20

  return (
    <header
      className={`fixed top-0 w-full z-50 glass-header border-b transition-all duration-300 ${
        scrolled
          ? 'border-white/10 shadow-lg'
          : 'border-transparent shadow-none'
      }`}
      role="banner"
    >
      <div className="flex justify-between items-center h-20 px-16 max-w-[1440px] mx-auto">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          aria-label="DriverGuard AI Home"
        >
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Shield className="text-primary" size={22} />
          </div>
          <span className="font-display text-headline-md text-primary tracking-tighter">
            DriverGuard AI
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-8 items-center" role="navigation" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.href.startsWith('#') ? '/' : link.href}
              className={({ isActive }) =>
                `font-label-caps text-label-caps transition-colors tracking-[0.05em] uppercase pb-1 ${
                  isActive && link.href === '/'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`
              }
              end
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="glass" size="sm">
              Live Demo
            </Button>
          </Link>
          <Button variant="primary" size="md">
            Get Started
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-on-surface-variant hover:text-on-surface transition-colors p-2 rounded"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden glass-header border-t border-white/10 overflow-hidden"
          >
            <nav className="flex flex-col px-6 py-4 gap-4" role="navigation" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors tracking-[0.05em] uppercase py-2 border-b border-white/5"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button variant="glass" size="sm" className="w-full mt-2">
                  Live Demo
                </Button>
              </Link>
              <Button variant="primary" size="md" className="w-full">
                Get Started
              </Button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
})

export default Navbar
