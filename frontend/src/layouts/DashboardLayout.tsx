import React, { ReactNode, useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  LayoutDashboard,
  Radio,
  Users,
  Truck,
  Navigation,
  BarChart3,
  FileText,
  AlertTriangle,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  ChevronDown,
  Wifi,
  MapPin,
  Clock,
  User as UserIcon,
  CreditCard,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/Shared/ThemeToggle'

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const currentTime = useClockTime()

  // Fullscreen API toggle
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
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return parts[0].substring(0, 2).toUpperCase()
  }

  const NAV_ITEMS = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Live Monitoring', icon: Radio, path: '/monitor' },
    { label: 'Drivers', icon: Users, path: '#drivers' },
    { label: 'Vehicles', icon: Truck, path: '#vehicles' },
    { label: 'Trips', icon: Navigation, path: '#trips' },
    { label: 'Analytics', icon: BarChart3, path: '#analytics' },
    { label: 'Reports', icon: FileText, path: '#reports' },
    { label: 'Alerts', icon: AlertTriangle, path: '#alerts' },
    { label: 'Settings', icon: Settings, path: '/settings' },
    { label: 'Support', icon: HelpCircle, path: '#support' },
  ]

  return (
    <div className="w-screen h-screen min-h-screen bg-background text-on-surface flex flex-col overflow-hidden transition-colors duration-300">
      {/* ── TOP HEADER (Sticky Commercial Header) ── */}
      <header className="h-14 bg-surface border-b border-border px-4 flex items-center justify-between flex-shrink-0 z-40 shadow-xs transition-colors duration-300">
        {/* Left: Brand Logo & Sidebar Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-surface text-on-surface-variant hover:text-on-surface transition-colors"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <Shield className="text-primary" size={18} />
            </div>
            <span className="font-display font-extrabold text-base tracking-tight text-on-surface">
              DriverGuard <span className="text-primary font-normal">AI</span>
            </span>
          </Link>
        </div>

        {/* Center: Live Vehicle & Trip Telemetry */}
        <div className="hidden lg:flex items-center gap-6 text-xs text-on-surface-variant font-medium">
          <div className="flex items-center gap-2 bg-card px-3 py-1 rounded-lg border border-border">
            <Truck size={14} className="text-primary" />
            <span className="font-bold text-on-surface font-mono">FLEET #4082</span>
            <span className="text-[10px] text-on-surface-variant">• Cascadia</span>
          </div>

          <div className="flex items-center gap-2">
            <UserIcon size={14} className="text-on-surface-variant" />
            <span className="text-on-surface font-semibold">John Driver</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
              ON TRIP
            </span>
          </div>

          <div className="flex items-center gap-4 border-l border-border pl-4">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-emerald-500" />
              GPS: <span className="text-emerald-500 font-bold">LOCKED</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Wifi size={13} className="text-emerald-500" />
              NET: <span className="text-emerald-500 font-bold">5G</span>
            </span>
            <span className="flex items-center gap-1.5 font-mono bg-card px-2.5 py-1 rounded border border-border text-on-surface font-bold">
              <Clock size={12} className="text-primary" />
              {currentTime}
            </span>
          </div>
        </div>

        {/* Right: Actions, Theme, Fullscreen & Profile */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl border border-border bg-card hover:bg-surface text-on-surface-variant hover:text-on-surface transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen)
                setProfileOpen(false)
              }}
              className="p-2 rounded-xl border border-border bg-card hover:bg-surface text-on-surface-variant hover:text-on-surface transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={16} />
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
                      Live Fleet Notifications
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                      2 New
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface transition-colors">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-on-surface">Vehicle #4082 Active</p>
                        <p className="text-[11px] text-on-surface-variant">Live AI safety tracking operational.</p>
                        <span className="text-[9px] text-on-surface-variant opacity-75">Just now</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface transition-colors">
                      <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-on-surface">Fatigue Rest Warning</p>
                        <p className="text-[11px] text-on-surface-variant">Driver John D. took scheduled break.</p>
                        <span className="text-[9px] text-on-surface-variant opacity-75">12 mins ago</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile Avatar & Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen)
                setNotificationsOpen(false)
              }}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-border bg-card hover:bg-surface transition-all group"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-primary/30" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center">
                  {getUserInitials()}
                </div>
              )}
              <span className="hidden sm:inline-block text-xs font-semibold text-on-surface max-w-[90px] truncate">
                {user?.name || 'Operator'}
              </span>
              <ChevronDown size={14} className="text-on-surface-variant group-hover:text-on-surface" />
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-3 w-64 bg-card border border-border rounded-2xl shadow-xl p-3 z-50 space-y-1"
                >
                  <div className="p-3 bg-surface rounded-xl border border-border/50 mb-2">
                    <p className="text-xs font-bold text-on-surface truncate">{user?.name || 'Fleet Operator'}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">{user?.email}</p>
                    <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {user?.company || 'Apex Fleet Logistics'}
                    </span>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors"
                  >
                    <UserIcon size={15} className="text-primary" />
                    <span>Profile</span>
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors"
                  >
                    <Settings size={15} className="text-primary" />
                    <span>Settings</span>
                  </Link>

                  <a
                    href="#pricing"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface rounded-xl transition-colors"
                  >
                    <CreditCard size={15} className="text-primary" />
                    <span>Billing & Fleet Subscription</span>
                  </a>

                  <div className="border-t border-border pt-1 mt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors text-left"
                    >
                      <LogOut size={15} />
                      <span>Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── MAIN BODY CONTAINER (Sidebar + Dashboard Content) ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Collapsible Sidebar */}
        <aside
          className={`bg-surface border-r border-border flex flex-col justify-between transition-all duration-300 z-30 ${
            sidebarCollapsed ? 'w-16' : 'w-56'
          }`}
        >
          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.label}
                  to={item.path.startsWith('/') ? item.path : '#'}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-card'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Sidebar Footer Logout */}
          <div className="p-3 border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors text-left"
              title={sidebarCollapsed ? 'Logout' : undefined}
            >
              <LogOut size={18} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Dashboard Main Content Window */}
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
