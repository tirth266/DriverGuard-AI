import { memo, useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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
  Building2,
  Truck,
  CreditCard,
  Radio,
} from 'lucide-react'
import { useScrollY } from '../../hooks/useScrollY'
import { useAuth } from '../../context/AuthContext'
import Button from '../shared/Button'
import ThemeToggle from './ThemeToggle'

export default memo(function Navbar() {
  const scrollY = useScrollY()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(2)
  const scrolled = scrollY > 15

  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const accountType = user?.accountType ?? null
  const isBusiness = accountType === 'business'

  const isMonitorPage = location.pathname.includes('/monitoring') || location.pathname.includes('/monitor')
  const isDashboardPage = location.pathname === '/dashboard' || location.pathname.startsWith('/business/dashboard') || location.pathname.startsWith('/personal/dashboard') || location.pathname === '/fleet'

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
      if (location.pathname !== '/') {
        navigate('/' + href)
      } else {
        const el = document.querySelector(href)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }
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

  const overviewHref = isAuthenticated
    ? (isBusiness ? '/business/dashboard' : '/personal/dashboard')
    : '/'

  const monitorHref = isAuthenticated
    ? (isBusiness ? '/business/monitoring' : '/personal/monitoring')
    : '/auth'

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-[#070707]/90 backdrop-blur-md border-b border-white/10 shadow-xs'
          : 'bg-[#070707]/60 backdrop-blur-xs border-b border-white/5'
      }`}
      role="banner"
    >
      <div className="max-w-[1280px] mx-auto h-[76px] px-6 flex items-center justify-between" ref={dropdownRef}>

        {/* ── LEFT: Logo ── */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-[8px]"
          aria-label="DriverGuard AI Homepage"
        >
          <div className="w-8 h-8 rounded-[8px] bg-brand/10 border border-brand/25 flex items-center justify-center transition-colors group-hover:bg-brand/20">
            <Shield className="text-brand w-4 h-4" />
          </div>
          <span className="font-display font-bold text-[17px] tracking-tight text-text-primary">
            DriverGuard <span className="text-brand font-semibold">AI</span>
          </span>
        </Link>

        {/* ── CENTER: Professional Navigation ── */}
        <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main Navigation">
          {isAuthenticated ? (
            <>
              <Link
                to={overviewHref}
                className={`px-3 py-1.5 text-xs font-medium rounded-[8px] transition-colors ${
                  isDashboardPage
                    ? 'text-white bg-white/10'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                Overview
              </Link>
              <Link
                to={monitorHref}
                className={`px-3 py-1.5 text-xs font-medium rounded-[8px] transition-colors flex items-center gap-1.5 ${
                  isMonitorPage
                    ? 'text-white bg-white/10'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse" />
                Live Monitor
              </Link>
              <Link
                to={isBusiness ? '/business/dashboard' : '/personal/ride-summary'}
                className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 rounded-[8px] transition-colors"
              >
                Analytics
              </Link>
              {isBusiness ? (
                <Link
                  to="/business/drivers"
                  className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 rounded-[8px] transition-colors"
                >
                  Drivers
                </Link>
              ) : (
                <Link
                  to="/personal/profile"
                  className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 rounded-[8px] transition-colors"
                >
                  Driver Profile
                </Link>
              )}
              <Link
                to={isBusiness ? '/business/dashboard' : '/personal/dashboard'}
                className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 rounded-[8px] transition-colors"
              >
                Alerts
              </Link>
            </>
          ) : (
            <>
              <a
                href="#top"
                onClick={e => handleAnchorClick(e, '#top')}
                className="px-3.5 py-1.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 rounded-[8px] transition-colors"
              >
                Overview
              </a>
              <a
                href="#solutions"
                onClick={e => handleAnchorClick(e, '#solutions')}
                className="px-3.5 py-1.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 rounded-[8px] transition-colors"
              >
                Live Monitor
              </a>
              <a
                href="#cv-showcase"
                onClick={e => handleAnchorClick(e, '#cv-showcase')}
                className="px-3.5 py-1.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 rounded-[8px] transition-colors"
              >
                Computer Vision
              </a>
              <a
                href="#metrics"
                onClick={e => handleAnchorClick(e, '#metrics')}
                className="px-3.5 py-1.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 rounded-[8px] transition-colors"
              >
                Fleet Metrics
              </a>
              <a
                href="#pricing"
                onClick={e => handleAnchorClick(e, '#pricing')}
                className="px-3.5 py-1.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 rounded-[8px] transition-colors"
              >
                Enterprise
              </a>
            </>
          )}
        </nav>

        {/* ── RIGHT: Controls & Profile ── */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5">
              {/* Meaningful Contextual Action (Live Monitor if not already on it) */}
              {!isMonitorPage && (
                <Link to={monitorHref} className="hidden sm:inline-flex">
                  <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                    <Radio size={13} className="text-brand" />
                    <span>Live Monitor</span>
                  </Button>
                </Link>
              )}

              {/* Notifications with counter dot only when unread */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen)
                    setProfileOpen(false)
                  }}
                  className="w-8 h-8 rounded-[8px] border border-border bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center relative focus:outline-none"
                  aria-label="Notifications"
                >
                  <Bell size={15} />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-warning" />
                  )}
                </button>

                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-[14px] shadow-2xl p-3 z-50"
                    >
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                        <span className="text-xs font-semibold text-text-primary">Fleet Notifications</span>
                        {unreadNotifications > 0 && (
                          <button
                            onClick={() => setUnreadNotifications(0)}
                            className="text-[10px] text-brand hover:underline font-medium cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="p-2 rounded-[8px] bg-card border border-border/60">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-text-primary">AI Telemetry Active</span>
                            <span className="text-[9px] text-text-muted">Just now</span>
                          </div>
                          <p className="text-[11px] text-text-secondary mt-0.5">YOLO11 stream verified at 30 FPS.</p>
                        </div>
                        <div className="p-2 rounded-[8px] bg-card border border-border/60">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-warning">Rest Interval Recommended</span>
                            <span className="text-[9px] text-text-muted">18m ago</span>
                          </div>
                          <p className="text-[11px] text-text-secondary mt-0.5">Marcus Vance exceeded 4h continuous driving.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Compact User Menu: [Avatar] Name ▾ */}
              <div className="relative">
                <button
                  onClick={() => {
                    setProfileOpen(!profileOpen)
                    setNotificationsOpen(false)
                  }}
                  className="flex items-center gap-2 py-1 px-1.5 pr-2.5 rounded-[8px] border border-border bg-surface hover:bg-surface-hover text-text-primary transition-colors group focus:outline-none"
                  aria-expanded={profileOpen}
                  aria-label="User profile menu"
                >
                  <div className="w-6 h-6 rounded-full bg-brand/20 text-brand text-[11px] font-bold flex items-center justify-center border border-brand/30">
                    {getUserInitials()}
                  </div>
                  <span className="text-xs font-medium text-text-primary max-w-[110px] truncate">{user.name}</span>
                  <ChevronDown size={13} className="text-text-muted group-hover:text-text-primary transition-colors" />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-[14px] shadow-2xl p-2 z-50 space-y-1"
                    >
                      <div className="px-3 py-2 border-b border-border mb-1">
                        <p className="text-xs font-semibold text-text-primary truncate">{user.name}</p>
                        <p className="text-[11px] text-text-muted truncate">{user.email}</p>
                      </div>

                      <Link
                        to="/personal/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-[8px] transition-colors"
                      >
                        <UserIcon size={14} className="text-text-muted" /> Profile
                      </Link>

                      {isBusiness && (
                        <>
                          <Link
                            to="/business/dashboard"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-[8px] transition-colors"
                          >
                            <Truck size={14} className="text-text-muted" /> Fleet Management
                          </Link>
                          <Link
                            to="/business/company"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-[8px] transition-colors"
                          >
                            <Building2 size={14} className="text-text-muted" /> Company Profile
                          </Link>
                          <Link
                            to="/business/billing"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-[8px] transition-colors"
                          >
                            <CreditCard size={14} className="text-text-muted" /> Subscription
                          </Link>
                        </>
                      )}

                      <Link
                        to="/personal/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-[8px] transition-colors"
                      >
                        <Settings size={14} className="text-text-muted" /> Settings
                      </Link>

                      <div className="border-t border-border pt-1 mt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 rounded-[8px] transition-colors text-left"
                        >
                          <LogOut size={14} /> Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link to="/auth" className="hidden sm:inline-flex">
                <Button variant="ghost" size="sm" className="text-xs">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button variant="primary" size="sm" className="text-xs">Get Started Free</Button>
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 rounded-[8px] border border-border bg-surface text-text-secondary hover:text-text-primary"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-border bg-[#070707] px-6 py-4 space-y-3"
          >
            <nav className="flex flex-col gap-2">
              <Link
                to={overviewHref}
                onClick={() => setMobileOpen(false)}
                className="py-2 text-sm text-text-secondary hover:text-white border-b border-border/40"
              >
                Overview
              </Link>
              <Link
                to={monitorHref}
                onClick={() => setMobileOpen(false)}
                className="py-2 text-sm text-text-secondary hover:text-white border-b border-border/40 flex items-center justify-between"
              >
                <span>Live Monitor</span>
                <span className="w-1.5 h-1.5 rounded-full bg-safe" />
              </Link>
              <a
                href="#cv-showcase"
                onClick={e => handleAnchorClick(e, '#cv-showcase')}
                className="py-2 text-sm text-text-secondary hover:text-white border-b border-border/40"
              >
                Computer Vision
              </a>
              <a
                href="#metrics"
                onClick={e => handleAnchorClick(e, '#metrics')}
                className="py-2 text-sm text-text-secondary hover:text-white border-b border-border/40"
              >
                Fleet Metrics
              </a>
              <a
                href="#pricing"
                onClick={e => handleAnchorClick(e, '#pricing')}
                className="py-2 text-sm text-text-secondary hover:text-white border-b border-border/40"
              >
                Pricing
              </a>
            </nav>

            <div className="pt-2">
              {isAuthenticated ? (
                <button
                  onClick={() => { setMobileOpen(false); handleLogout() }}
                  className="w-full py-2 text-xs font-semibold text-danger text-center"
                >
                  Sign Out
                </button>
              ) : (
                <Link to="/auth" onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" size="md" className="w-full text-xs">
                    Start Free Trial
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
})
