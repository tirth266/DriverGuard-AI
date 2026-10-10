import { type ReactNode, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  LogOut,
  Bell,
  Maximize2,
  Minimize2,
  ChevronDown,
  Clock,
  Truck,
  User as UserIcon,
  CreditCard,
  Settings,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/layout/ThemeToggle'

interface DashboardLayoutProps {
  children: ReactNode
}

function useClockTime() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      )
    }
    updateTime()
    const t = setInterval(updateTime, 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const currentTime = useClockTime()

  const isBusiness = user?.accountType === 'business' || user?.role === 'business'

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
      }
    }
  }

  const handleLogout = () => {
    setProfileOpen(false)
    logout()
    navigate('/', { replace: true })
  }

  const getUserInitials = () => {
    if (!user || !user.name) return 'DG'
    const parts = user.name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0].substring(0, 2).toUpperCase()
  }

  return (
    <div className="w-screen h-screen max-h-screen bg-background text-text-primary flex flex-col overflow-hidden">

      {/* ── TOP HEADER (60px) ── */}
      <header className="h-[60px] bg-surface border-b border-border px-5 flex items-center justify-between flex-shrink-0 z-40">

        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 focus:outline-none">
          <div className="h-7 w-7 rounded-[7px] bg-brand/10 border border-brand/20 flex items-center justify-center">
            <Shield className="text-brand" size={15} />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-text-primary">
            DriverGuard <span className="text-brand font-medium">AI</span>
          </span>
        </Link>

        {/* Center: account context and the local clock.

            These read from the signed-in session and the browser clock only. No
            vehicle id, GPS fix, connectivity state or trip status is shown here:
            nothing in the app measures them, so a fixed vehicle number or a
            "GPS LOCKED" badge would assert something never observed. */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono text-text-secondary">
          <div className="flex items-center gap-2 bg-card px-2.5 py-1 rounded-[6px] border border-border">
            <UserIcon size={12} className="text-brand" />
            <span className="font-semibold text-text-primary">{user?.name || 'Operator'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-safe/10 text-safe font-bold border border-safe/20">
              {isBusiness ? 'FLEET' : 'PERSONAL'}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-text-muted">
            <span className="flex items-center gap-1 font-mono bg-card px-2 py-0.5 rounded-[4px] border border-border text-text-primary font-bold">
              <Clock size={11} className="text-brand" />
              {currentTime}
            </span>
          </div>
        </div>

        {/* Right: Controls & Profile */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-[8px] border border-border bg-card hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Notifications. No alert feed exists, so there is nothing to unread-badge;
              the panel states that rather than showing a permanently "1 new"
              dot over an empty list. */}
          <div className="relative">
            <button
              onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false) }}
              className="p-1.5 rounded-[8px] border border-border bg-card hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={15} />
            </button>

            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-[14px] shadow-2xl p-3 z-50 space-y-2"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-semibold text-text-primary">Notifications</span>
                  </div>
                  <p className="p-2 rounded-[8px] bg-card border border-border/60 text-[11px] text-text-secondary leading-relaxed">
                    No notifications. Alerts are recorded against the ride being
                    monitored and shown on that ride's report.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Menu: Compact [Avatar] Name ▾ */}
          <div className="relative">
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false) }}
              className="flex items-center gap-2 py-1 px-1.5 pr-2 rounded-[8px] border border-border bg-card hover:bg-surface-hover transition-colors group"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full object-cover border border-brand/30" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-brand text-white font-bold text-[10px] flex items-center justify-center">
                  {getUserInitials()}
                </div>
              )}
              <span className="hidden sm:inline-block text-xs font-medium text-text-primary max-w-[80px] truncate">
                {user?.name || 'Operator'}
              </span>
              <ChevronDown size={12} className="text-text-muted group-hover:text-text-primary" />
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
                    <p className="text-xs font-semibold text-text-primary truncate">{user?.name || 'Fleet Operator'}</p>
                    <p className="text-[11px] text-text-muted truncate">{user?.email}</p>
                  </div>

                  <Link
                    to="/personal/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-[8px] transition-colors"
                  >
                    <UserIcon size={14} className="text-text-muted" /> Profile
                  </Link>

                  {isBusiness && (
                    <>
                      <Link
                        to="/business/dashboard"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-[8px] transition-colors"
                      >
                        <Truck size={14} className="text-text-muted" /> Fleet Management
                      </Link>
                      <Link
                        to="/business/billing"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-[8px] transition-colors"
                      >
                        <CreditCard size={14} className="text-text-muted" /> Billing
                      </Link>
                    </>
                  )}

                  <Link
                    to="/personal/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-[8px] transition-colors"
                  >
                    <Settings size={14} className="text-text-muted" /> Settings
                  </Link>

                  <div className="border-t border-border pt-1 mt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 rounded-[8px] transition-colors text-left"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </header>

      {/* Main Content Viewport */}
      <div className="flex-1 w-full h-[calc(100vh-60px)] overflow-hidden">
        {children}
      </div>

    </div>
  )
}
