import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Shield } from 'lucide-react'
import { useScrollY } from '../../hooks/useScrollY'
import Button from '../Shared/Button'
import ThemeToggle from '../Shared/ThemeToggle'

const NAV_LINKS = [
  { label: 'Solutions', href: '#solutions' },
  { label: 'Features', href: '#features' },
  { label: 'Industries', href: '#industries' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

const Navbar = memo(function Navbar() {
  const scrollY = useScrollY()
  const [mobileOpen, setMobileOpen] = useState(false)
  const scrolled = scrollY > 20

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      const el = document.querySelector(href)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
      setMobileOpen(false)
    }
  }

  return (
    <header
      className={`fixed top-0 w-full z-50 glass-header border-b transition-all duration-300 ${
        scrolled
          ? 'shadow-sm border-border'
          : 'border-transparent shadow-none'
      }`}
      role="banner"
    >
      <div className="flex justify-between items-center h-20 px-4 md:px-16 max-w-[1440px] mx-auto">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          aria-label="DriverGuard AI Home"
        >
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Shield className="text-primary" size={22} />
          </div>
          <span className="font-display text-headline-md text-on-surface font-extrabold tracking-tighter">
            DriverGuard AI
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex gap-8 items-center" role="navigation" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className="font-label-caps text-label-caps transition-colors tracking-[0.05em] uppercase pb-1 text-on-surface-variant hover:text-primary font-medium"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA & Theme Toggle */}
        <div className="hidden lg:flex items-center gap-3">
          <a href="#contact" onClick={(e) => handleAnchorClick(e, '#contact')}>
            <Button variant="glass" size="sm">
              Book Demo
            </Button>
          </a>
          <Link to="/dashboard">
            <Button variant="primary" size="md">
              Get Started
            </Button>
          </Link>
          <div className="pl-1">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            className="text-on-surface-variant hover:text-on-surface transition-colors p-2 rounded"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
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
            className="lg:hidden glass-header border-t border-border overflow-hidden"
          >
            <nav className="flex flex-col px-6 py-4 gap-4" role="navigation" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors tracking-[0.05em] uppercase py-2 border-b border-border/50 font-medium"
                  onClick={(e) => handleAnchorClick(e, link.href)}
                >
                  {link.label}
                </a>
              ))}
              <a href="#contact" onClick={(e) => handleAnchorClick(e, '#contact')}>
                <Button variant="glass" size="sm" className="w-full mt-2">
                  Book Demo
                </Button>
              </a>
              <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button variant="primary" size="md" className="w-full">
                  Get Started
                </Button>
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
})

export default Navbar
