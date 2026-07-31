import { memo, useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  Shield,
  Bell,
  User as UserIcon,
  Settings,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  CreditCard,
} from 'lucide-react'
import { useScrollY } from '../../hooks/useScrollY'
import { useAuth } from '../../context/AuthContext'
import Button from '../shared/Button'
import ThemeToggle from './ThemeToggle'

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
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const scrolled = scrollY > 20

  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleLogout = () => {
    setProfileOpen(false)
    logout()
    navigate('/', { replace: true })
  }

  // Get User Initials
  const getUserInitials = () => {
    if (!user || !user.name) return 'DG'
    const parts = user.name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return parts[0].substring(0, 2).toUpperCase()
  }

  return (
    <header
      className={`fixed top-0 w-full z-50 glass-header border-b transition-all duration-300 ${
        scrolled ? 'shadow-sm border-border' : 'border-transparent shadow-none'
      }`}
      role="banner"
    >
      <div className="flex justify-between items-center h-20 px-4 md:px-16 max-w-[1440px] mx-auto" ref={dropdownRef}>
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          aria-label="DriverGuard AI Home"
        >
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Shield className="text-primary" size={22} />
          </div>
          <span className="font-display text-headline-md text-on-surface font-extrabold tracking-tighter">
            DriverGuard <span className="text-primary font-normal">AI</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex gap-8 items-center" role="navigation" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className="font-label-caps text-label-caps transition-colors tracking-[0.05em] uppercase pb-1 text-on-surface-variant hover:text-primary font-medium text-xs"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA & User Controls */}
        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated && user ? (
            /* LOGGED IN CONTROLS */
            <div className="flex items-center gap-3 pl-2 relative">
              {/* Dashboard Direct Button */}
              <Link to="/dashboard">
                <Button variant="primary" size="sm" className="flex items-center gap-1.5">
                  <LayoutDashboard size={14} />
                  <span>Dashboard</span>
                </Button>
              </Link>

              {/* Notifications Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen)
                    setProfileOpen(false)
                  }}
                  className="p-2 rounded-xl border border-border bg-card hover:bg-surface text-on-surface-variant hover:text-on-surface transition-colors relative"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
                </button>

                {/* Notifications Popover */}
                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-80 bg-card border border-border rounded-2xl shadow-xl p-4 z-50"
                    >
                      <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                          Notifications
                        </span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                          2 New
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface transition-colors">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-on-surface">Vehicle #104 Active</p>
                            <p className="text-[11px] text-on-surface-variant">Live AI safety tracking operational.</p>
                            <span className="text-[9px] text-on-surface-variant opacity-75">2 mins ago</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface transition-colors">
                          <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-on-surface">Fatigue Warning Resolved</p>
                            <p className="text-[11px] text-on-surface-variant">Driver John D. took 15m rest break.</p>
                            <span className="text-[9px] text-on-surface-variant opacity-75">14 mins ago</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile Avatar Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setProfileOpen(!profileOpen)
                    setNotificationsOpen(false)
                  }}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-border bg-card hover:bg-surface transition-all group"
                  aria-expanded={profileOpen}
                  aria-label="User menu"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border border-primary/30"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center">
                      {getUserInitials()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-on-surface max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown size={14} className="text-on-surface-variant group-hover:text-on-surface transition-colors" />
                </button>

                {/* Profile Dropdown Popover */}
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-64 bg-card border border-border rounded-2xl shadow-xl p-3 z-50 space-y-1"
                    >
                      {/* User Summary Header */}
                      <div className="p-3 bg-surface rounded-xl border border-border/50 mb-2">
                        <p className="text-xs font-bold text-on-surface truncate">{user.name}</p>
                        <p className="text-[11px] text-on-surface-variant truncate">{user.email}</p>
                        <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {user.company}
                        </span>
                      </div>

                      {/* Dropdown Items */}
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors"
                      >
                        <UserIcon size={16} className="text-primary" />
                        <span>Profile</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors"
                      >
                        <Settings size={16} className="text-primary" />
                        <span>Settings</span>
                      </Link>

                      <a
                        href="#pricing"
                        onClick={(e) => {
                          handleAnchorClick(e, '#pricing')
                          setProfileOpen(false)
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors"
                      >
                        <CreditCard size={16} className="text-primary" />
                        <span>Billing & Subscription</span>
                      </a>

                      <div className="border-t border-border pt-1 mt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors text-left"
                        >
                          <LogOut size={16} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            /* UNAUTHENTICATED CONTROLS */
            <>
              <Link to="/auth">
                <Button variant="glass" size="sm">
                  Book Demo
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="primary" size="md">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger button */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            className="text-on-surface-variant hover:text-on-surface transition-colors p-2 rounded-xl border border-border bg-card"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
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
            <nav className="flex flex-col px-6 py-4 gap-3" role="navigation" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors tracking-wider uppercase py-2 border-b border-border/50"
                  onClick={(e) => handleAnchorClick(e, link.href)}
                >
                  {link.label}
                </a>
              ))}

              {isAuthenticated && user ? (
                <div className="pt-2 space-y-2 border-t border-border">
                  <div className="p-3 bg-surface rounded-xl border border-border">
                    <p className="text-xs font-bold text-on-surface">{user.name}</p>
                    <p className="text-[11px] text-on-surface-variant">{user.email}</p>
                  </div>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button variant="primary" size="md" className="w-full">
                      Go to Dashboard
                    </Button>
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false)
                      handleLogout()
                    }}
                    className="w-full py-2 text-xs font-bold text-rose-500 hover:underline text-center"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="pt-2 space-y-2">
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <Button variant="glass" size="sm" className="w-full">
                      Book Demo
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <Button variant="primary" size="md" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
})

export default Navbar
