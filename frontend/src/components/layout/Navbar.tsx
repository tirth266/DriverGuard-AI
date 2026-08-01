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
  Building2,
  Zap,
  Truck,
  CreditCard,
} from 'lucide-react'
import { useScrollY } from '../../hooks/useScrollY'
import { useAuth } from '../../context/AuthContext'
import Button from '../shared/Button'
import ThemeToggle from './ThemeToggle'

/* ─── Public nav links (unauthenticated) ─────────────────── */
const PUBLIC_LINKS = [
  { label: 'Features',   href: '#features' },
  { label: 'Industries', href: '#industries' },
  { label: 'Pricing',    href: '#pricing' },
  { label: 'About',      href: '#about' },
  { label: 'Contact',    href: '#contact' },
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

  const accountType = user?.accountType ?? null
  const isPersonal  = accountType === 'personal'
  const isBusiness  = accountType === 'business'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
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
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
      setMobileOpen(false)
    }
  }

  const handleLogout = () => {
    setProfileOpen(false)
    logout()
    navigate('/', { replace: true })
  }

  const getUserInitials = () => {
    if (!user?.name) return 'DG'
    const parts = user.name.trim().split(' ')
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].substring(0, 2).toUpperCase()
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
        <Link to="/" className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded" aria-label="DriverGuard AI Home">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Shield className="text-primary" size={22} />
          </div>
          <span className="font-display text-headline-md text-on-surface font-extrabold tracking-tighter">
            DriverGuard <span className="text-primary font-normal">AI</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex gap-7 items-center" role="navigation" aria-label="Main navigation">
          {!isAuthenticated && PUBLIC_LINKS.map(link => (
            <a key={link.label} href={link.href}
              onClick={e => handleAnchorClick(e, link.href)}
              className="font-label-caps text-label-caps transition-colors tracking-[0.05em] uppercase text-on-surface-variant hover:text-primary font-medium text-xs">
              {link.label}
            </a>
          ))}

          {/* Authenticated: Personal */}
          {isAuthenticated && isPersonal && (
            <>
              <Link to="/dashboard" className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors uppercase tracking-wider">
                Dashboard
              </Link>
            </>
          )}

          {/* Authenticated: Business */}
          {isAuthenticated && isBusiness && (
            <>
              <Link to="/dashboard" className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors uppercase tracking-wider">
                Dashboard
              </Link>
              <Link to="/fleet" className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors uppercase tracking-wider">
                Fleet
              </Link>
              <Link to="/company-setup" className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors uppercase tracking-wider">
                Company
              </Link>
              <Link to="/enterprise" className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors uppercase tracking-wider">
                Billing
              </Link>
            </>
          )}

          {/* Authenticated: no accountType yet */}
          {isAuthenticated && !accountType && (
            <Link to="/onboarding" className="text-xs font-semibold text-primary uppercase tracking-wider">
              Complete Setup
            </Link>
          )}
        </nav>

        {/* Desktop Right Controls */}
        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 pl-1 relative">
              {/* Dashboard button */}
              <Link to={isBusiness ? '/fleet' : '/dashboard'}>
                <Button variant="primary" size="sm" className="flex items-center gap-1.5">
                  <LayoutDashboard size={14} />
                  <span>{isBusiness ? 'Fleet Console' : 'Dashboard'}</span>
                </Button>
              </Link>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false) }}
                  className="p-2 rounded-xl border border-border bg-card hover:bg-surface text-on-surface-variant hover:text-on-surface transition-colors relative"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
                </button>
                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 mt-3 w-80 bg-card border border-border rounded-2xl shadow-xl p-4 z-50"
                    >
                      <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-on-surface">Notifications</span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">2 New</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface transition-colors">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-on-surface">AI Monitoring Active</p>
                            <p className="text-[11px] text-on-surface-variant">Live safety tracking is operational.</p>
                            <span className="text-[9px] text-on-surface-variant opacity-75">2 mins ago</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface transition-colors">
                          <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-on-surface">Fatigue Warning Resolved</p>
                            <p className="text-[11px] text-on-surface-variant">Driver took a rest break.</p>
                            <span className="text-[9px] text-on-surface-variant opacity-75">14 mins ago</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile avatar */}
              <div className="relative">
                <button
                  onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false) }}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-border bg-card hover:bg-surface transition-all group"
                  aria-expanded={profileOpen}
                  aria-label="User menu"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-primary/30" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center">
                      {getUserInitials()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-on-surface max-w-[100px] truncate">{user.name}</span>
                  <ChevronDown size={14} className="text-on-surface-variant group-hover:text-on-surface transition-colors" />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 mt-3 w-64 bg-card border border-border rounded-2xl shadow-xl p-3 z-50 space-y-1"
                    >
                      <div className="p-3 bg-surface rounded-xl border border-border/50 mb-2">
                        <p className="text-xs font-bold text-on-surface truncate">{user.name}</p>
                        <p className="text-[11px] text-on-surface-variant truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            {user.company}
                          </span>
                          {accountType && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              isPersonal
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-primary/10 text-primary border-primary/20'
                            }`}>
                              {isPersonal ? 'Personal' : 'Business'}
                            </span>
                          )}
                        </div>
                      </div>

                      <Link to="/profile" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors">
                        <UserIcon size={15} className="text-primary" /> Profile
                      </Link>

                      {isBusiness && (
                        <>
                          <Link to="/fleet" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors">
                            <Truck size={15} className="text-primary" /> Fleet Management
                          </Link>
                          <Link to="/company-setup" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors">
                            <Building2 size={15} className="text-primary" /> Company Profile
                          </Link>
                          <Link to="/enterprise" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors">
                            <CreditCard size={15} className="text-primary" /> Billing & Subscription
                          </Link>
                        </>
                      )}

                      <Link to="/settings" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors">
                        <Settings size={15} className="text-primary" /> Settings
                      </Link>

                      {isPersonal && (
                        <Link to="/enterprise" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors">
                          <Zap size={15} className="text-primary" /> Upgrade to Business
                        </Link>
                      )}

                      <div className="border-t border-border pt-1 mt-1">
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors text-left">
                          <LogOut size={15} /> Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <>
              <Link to="/enterprise">
                <Button variant="glass" size="sm">Business Plans</Button>
              </Link>
              <Link to="/auth">
                <Button variant="primary" size="md">Get Started Free</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            className="text-on-surface-variant hover:text-on-surface transition-colors p-2 rounded-xl border border-border bg-card"
            onClick={() => setMobileOpen(v => !v)}
            aria-expanded={mobileOpen}
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden glass-header border-t border-border overflow-hidden"
          >
            <nav className="flex flex-col px-6 py-4 gap-3" role="navigation" aria-label="Mobile navigation">
              {!isAuthenticated && PUBLIC_LINKS.map(link => (
                <a key={link.label} href={link.href}
                  onClick={e => handleAnchorClick(e, link.href)}
                  className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors tracking-wider uppercase py-2 border-b border-border/50">
                  {link.label}
                </a>
              ))}

              {isAuthenticated && user ? (
                <div className="pt-2 space-y-2">
                  <div className="p-3 bg-surface rounded-xl border border-border">
                    <p className="text-xs font-bold text-on-surface">{user.name}</p>
                    <p className="text-[11px] text-on-surface-variant">{user.email}</p>
                    {accountType && (
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                        isPersonal
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {isPersonal ? 'Personal (Free)' : 'Business'}
                      </span>
                    )}
                  </div>
                  
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button variant="primary" size="md" className="w-full">Dashboard</Button>
                  </Link>

                  {isBusiness && (
                    <>
                      <Link to="/fleet" onClick={() => setMobileOpen(false)}>
                        <Button variant="glass" size="sm" className="w-full">Fleet Management</Button>
                      </Link>
                      <Link to="/company-setup" onClick={() => setMobileOpen(false)}>
                        <Button variant="glass" size="sm" className="w-full">Company Profile</Button>
                      </Link>
                      <Link to="/enterprise" onClick={() => setMobileOpen(false)}>
                        <Button variant="glass" size="sm" className="w-full">Billing</Button>
                      </Link>
                    </>
                  )}

                  {isPersonal && (
                    <Link to="/enterprise" onClick={() => setMobileOpen(false)}>
                      <Button variant="glass" size="sm" className="w-full">Upgrade to Business</Button>
                    </Link>
                  )}

                  <button onClick={() => { setMobileOpen(false); handleLogout() }}
                    className="w-full py-2 text-xs font-bold text-rose-500 hover:underline text-center">
                    Logout
                  </button>
                </div>
              ) : (
                <div className="pt-2 space-y-2">
                  <Link to="/enterprise" onClick={() => setMobileOpen(false)}>
                    <Button variant="glass" size="sm" className="w-full">Business Plans</Button>
                  </Link>
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <Button variant="primary" size="md" className="w-full">Get Started Free</Button>
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
