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
  Wifi,
  MapPin,
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
    <div className="w-screen h-screen max-h-screen bg-background text-on-surface flex flex-col overflow-hidden transition-colors duration-300">

      {/* ── TOP HEADER (Fixed 56px / h-14) ── */}
      <header className="h-14 bg-surface border-b border-border px-4 flex items-center justify-between flex-shrink-0 z-40 shadow-sm transition-colors duration-300">

        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <Shield className="text-primary" size={18} />
          </div>
          <span className="font-display font-extrabold text-base tracking-tight text-on-surface">
            DriverGuard <span className="text-primary font-normal">AI</span>
          </span>
        </Link>

        {/* Center: Live Telemetry Chips (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-4 text-xs text-on-surface-variant font-medium">
          <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-lg border border-border">
            <Truck size={13} className="text-primary" />
            <span className="font-bold text-on-surface font-mono">FLEET #4082</span>
            <span className="text-[10px] text-on-surface-variant">• Cascadia</span>
          </div>

          <div className="flex items-center gap-2">
            <UserIcon size={13} className="text-on-surface-variant" />
            <span className="text-on-surface font-semibold">John Driver</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
              ON TRIP
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-3 border-l border-border pl-4">
            <span className="flex items-center gap-1.5">
              <MapPin size={12} className="text-emerald-500" />
              GPS: <span className="text-emerald-500 font-bold ml-1">LOCKED</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Wifi size={12} className="text-emerald-500" />
              NET: <span className="text-emerald-500 font-bold ml-1">5G</span>
            </span>
            <span className="flex items-center gap-1.5 font-mono bg-card px-2.5 py-1 rounded-lg border border-border text-on-surface font-bold">
              <Clock size={12} className="text-primary" />
              {currentTime}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl border border-border bg-card hover:bg-surface text-on-surface-variant hover:text-on-surface transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false) }}
              className="p-2 rounded-xl border border-border bg-card hover:bg-surface text-on-surface-variant hover:text-on-surface transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
            </button>

            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 mt-3 w-76 bg-card border border-border rounded-2xl shadow-2xl p-4 z-50"
                >
                  <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface">Live Notifications</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/20">2 New</span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-surface transition-colors">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-on-surface">Vehicle #4082 Active</p>
                        <p className="text-[11px] text-on-surface-variant">AI safety tracking is operational.</p>
                        <span className="text-[9px] text-on-surface-variant opacity-70">Just now</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-surface transition-colors">
                      <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-on-surface">Fatigue Rest Warning</p>
                        <p className="text-[11px] text-on-surface-variant">Driver John D. took a scheduled break.</p>
                        <span className="text-[9px] text-on-surface-variant opacity-70">12 mins ago</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false) }}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-border bg-card hover:bg-surface transition-all group"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-primary/30" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center">
                  {getUserInitials()}
                </div>
              )}
              <span className="hidden sm:inline-block text-xs font-semibold text-on-surface max-w-[80px] truncate">
                {user?.name || 'Operator'}
              </span>
              <ChevronDown size={13} className="text-on-surface-variant group-hover:text-on-surface" />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 mt-3 w-60 bg-card border border-border rounded-2xl shadow-2xl p-3 z-50 space-y-1"
                >
                  <div className="p-3 bg-surface rounded-xl border border-border/50 mb-2">
                    <p className="text-xs font-bold text-on-surface truncate">{user?.name || 'Fleet Operator'}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">{user?.email}</p>
                    <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      {user?.company || 'Apex Fleet Logistics'}
                    </span>
                  </div>

                  <Link to="/profile" onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors">
                    <UserIcon size={14} className="text-primary" /> Profile
                  </Link>

                  <Link to="/settings" onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors">
                    <Settings size={14} className="text-primary" /> Settings
                  </Link>

                  <a href="#pricing" onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors">
                    <CreditCard size={14} className="text-primary" /> Billing
                  </a>

                  <div className="border-t border-border pt-1 mt-1">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors text-left">
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── MAIN VIEWPORT WRAPPER (No Outer Scroll; Children handle scroll) ── */}
      <main className="flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-background flex flex-col">
        {children}
      </main>
    </div>
  )
}
