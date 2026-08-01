import { memo, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Radio,
  AlertTriangle,
  FileText,
  Building2,
  CreditCard,
  Settings,
  LogOut,
  UserPlus,
  Mail,
  Truck,
  Play,
  TrendingUp,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  Search,
  ChevronRight,
  Activity,
  Menu,
  X,
  Send,
  Phone,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

/* ─── Types & Mock Data ───────────────────────────────────── */

interface DriverItem {
  id: string
  name: string
  vehicle: string
  status: 'online' | 'offline' | 'alert'
  score: number
  lastAlert?: string
  tripsToday: number
}

const DRIVERS: DriverItem[] = [
  { id: 'DRV-101', name: 'John Driver', vehicle: 'Freightliner Cascadia #4082', status: 'online', score: 98, tripsToday: 4 },
  { id: 'DRV-102', name: 'Marcus Vance', vehicle: 'Kenworth T680 #2014', status: 'alert', score: 74, lastAlert: 'Fatigue Warning 12m ago', tripsToday: 3 },
  { id: 'DRV-103', name: 'Elena Rostova', vehicle: 'Volvo VNL 860 #1093', status: 'online', score: 95, tripsToday: 5 },
  { id: 'DRV-104', name: 'David Miller', vehicle: 'Peterbilt 579 #3021', status: 'offline', score: 91, tripsToday: 2 },
  { id: 'DRV-105', name: 'Samantha Reed', vehicle: 'Mack Anthem #5012', status: 'online', score: 99, tripsToday: 6 },
]

const RECENT_ACTIVITIES = [
  { time: '11:15 AM', type: 'alert', text: 'Fatigue Warning detected for Marcus Vance (Kenworth #2014)', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { time: '11:02 AM', type: 'safe', text: 'Safe Driving Restored: Elena Rostova (Volvo #1093)', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  { time: '10:45 AM', type: 'info', text: 'Shift Started: Samantha Reed assigned to Mack Anthem #5012', color: 'text-primary bg-primary/10 border-primary/20' },
  { time: '10:12 AM', type: 'alert', text: 'Phone Usage Detected: John Driver (Cascadia #4082) - Resolved', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
]

/* ─── Sidebar Nav Items (Top to Bottom) ────────────────────── */

const SIDEBAR_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/fleet' },
  { label: 'Drivers', icon: Users, path: '#drivers' },
  { label: 'Live Monitoring', icon: Radio, path: '/monitor' },
  { label: 'Alerts', icon: AlertTriangle, path: '#alerts' },
  { label: 'Reports', icon: FileText, path: '#reports' },
  { label: 'Company', icon: Building2, path: '/company-setup' },
  { label: 'Billing', icon: CreditCard, path: '/enterprise' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

const DEFAULT_INVITE_MESSAGE =
  'Welcome to DriverGuard AI.\nClick the invitation link below to join your company\'s fleet.'

const BusinessDashboard = memo(function BusinessDashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  // Sidebar states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Quick Action Modal states
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [invitePhone, setInvitePhone] = useState('')
  const [inviteMessage, setInviteMessage] = useState(DEFAULT_INVITE_MESSAGE)
  const [isSendingInvite, setIsSendingInvite] = useState(false)

  // Driver Table states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'alert'>('all')

  // Close modal on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && inviteModalOpen) {
        setInviteModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inviteModalOpen])

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !inviteName) return
    setIsSendingInvite(true)
    await new Promise(r => setTimeout(r, 700))
    setIsSendingInvite(false)
    setInviteModalOpen(false)
    toast.success('Invitation sent successfully.', `Invitation link delivered to ${inviteEmail}`)
    setInviteEmail('')
    setInviteName('')
    setInvitePhone('')
    setInviteMessage(DEFAULT_INVITE_MESSAGE)
  }

  const handleAddDriver = () => {
    navigate('/drivers/add')
  }

  const handleAddVehicle = () => {
    navigate('/vehicles/add')
  }

  const filteredDrivers = DRIVERS.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || d.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const onlineCount = DRIVERS.filter(d => d.status === 'online').length
  const alertCount = DRIVERS.filter(d => d.status === 'alert').length
  const offlineCount = DRIVERS.filter(d => d.status === 'offline').length

  return (
    <div className="flex w-full h-full overflow-hidden bg-background text-on-surface transition-colors duration-300">

      {/* ━━━ BUSINESS ADMIN SIDEBAR (Fixed Height, Non-Scrolling) ━━━ */}
      <aside
        className={`hidden md:flex flex-col justify-between bg-surface border-r border-border h-full flex-shrink-0 z-30 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Top: Header / Collapse toggle */}
        <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
          {!sidebarCollapsed && (
            <span className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant px-2">
              Fleet Admin
            </span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-xl border border-border bg-card hover:bg-surface text-on-surface-variant hover:text-on-surface transition-colors mx-auto"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Center: Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto flex-1">
          {SIDEBAR_ITEMS.map(item => {
            const Icon = item.icon
            const isExternalLink = item.path.startsWith('#')
            const isActive = !isExternalLink && location.pathname === item.path

            return (
              <motion.button
                key={item.label}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (isExternalLink) {
                    toast.info(item.label, `${item.label} section loaded.`)
                  } else {
                    navigate(item.path)
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-card border border-transparent hover:border-border'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </motion.button>
            )
          })}
        </nav>

        {/* Bottom: Logout (Always Fixed at Bottom of Sidebar) */}
        <div className="p-3 border-t border-border flex-shrink-0 mt-auto">
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors text-left"
            title={sidebarCollapsed ? 'Logout' : undefined}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!sidebarCollapsed && <span>Logout</span>}
          </motion.button>
        </div>
      </aside>

      {/* ━━━ MOBILE DRAWER TOGGLE ━━━ */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          className="p-3 rounded-full bg-primary text-white shadow-xl flex items-center justify-center"
          aria-label="Toggle Mobile Menu"
        >
          {mobileDrawerOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ━━━ MOBILE DRAWER OVERLAY ━━━ */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden flex justify-end"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-64 bg-card border-l border-border h-full p-4 flex flex-col justify-between"
              onClick={e => e.stopPropagation()}
            >
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <span className="font-extrabold text-sm text-on-surface">Fleet Admin Menu</span>
                  <button onClick={() => setMobileDrawerOpen(false)} className="text-on-surface-variant p-1">
                    <X size={18} />
                  </button>
                </div>
                <nav className="space-y-1">
                  {SIDEBAR_ITEMS.map(item => {
                    const Icon = item.icon
                    const isExternalLink = item.path.startsWith('#')
                    const isActive = !isExternalLink && location.pathname === item.path

                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          setMobileDrawerOpen(false)
                          if (isExternalLink) {
                            toast.info(item.label, `${item.label} section loaded.`)
                          } else {
                            navigate(item.path)
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface'
                        }`}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </div>

              <div className="border-t border-border pt-3">
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false)
                    handleLogout()
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━ MAIN SCROLLABLE CONTENT AREA ━━━ */}
      <main className="flex-1 w-full h-full overflow-y-auto p-4 md:p-8 space-y-8">

        {/* ── TOP QUICK ACTIONS SECTION ─────────────────────── */}
        <section className="space-y-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
              Quick Actions
            </h1>
            <p className="text-xs md:text-sm text-on-surface-variant mt-1">
              Manage your fleet quickly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Action 1: Add Driver (Primary) */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <UserPlus size={20} />
                </div>
                <h3 className="font-extrabold text-sm text-on-surface pt-1">Add Driver</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Create a new driver profile.
                </p>
              </div>
              <button
                onClick={handleAddDriver}
                className="w-full py-2.5 px-4 rounded-xl bg-primary text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-sm"
              >
                <UserPlus size={14} /> Add Driver
              </button>
            </motion.div>

            {/* Action 2: Invite Driver (Secondary) */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="h-10 w-10 rounded-xl bg-surface border border-border flex items-center justify-center text-on-surface-variant">
                  <Mail size={20} />
                </div>
                <h3 className="font-extrabold text-sm text-on-surface pt-1">Invite Driver</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Send an invitation email.
                </p>
              </div>
              <button
                onClick={() => setInviteModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-surface hover:bg-card border border-border text-on-surface font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Mail size={14} /> Invite Driver
              </button>
            </motion.div>

            {/* Action 3: Add Vehicle (Secondary) */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="h-10 w-10 rounded-xl bg-surface border border-border flex items-center justify-center text-on-surface-variant">
                  <Truck size={20} />
                </div>
                <h3 className="font-extrabold text-sm text-on-surface pt-1">Add Vehicle</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Register a new fleet vehicle.
                </p>
              </div>
              <button
                onClick={handleAddVehicle}
                className="w-full py-2.5 px-4 rounded-xl bg-surface hover:bg-card border border-border text-on-surface font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Truck size={14} /> Add Vehicle
              </button>
            </motion.div>

            {/* Action 4: Start Live Monitoring (Success / Blue Accent Featured) */}
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="bg-gradient-to-br from-primary/10 via-card to-card border-2 border-primary rounded-2xl p-5 shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold tracking-wider uppercase border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" /> LIVE 1080P
              </span>

              <div className="space-y-1.5">
                <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md">
                  <Play size={18} className="fill-current ml-0.5" />
                </div>
                <h3 className="font-extrabold text-sm text-on-surface pt-1">Start Live Monitoring</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Open the live monitoring center.
                </p>
              </div>

              <button
                onClick={() => navigate('/monitor')}
                className="w-full py-2.5 px-4 rounded-xl bg-primary text-white font-extrabold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md"
              >
                <Radio size={15} className="animate-pulse" /> Launch Live Console
              </button>
            </motion.div>

          </div>
        </section>

        {/* ── FLEET STATISTICS OVERVIEW ─────────────────────── */}
        <section className="space-y-4">
          <h2 className="font-display text-lg font-extrabold tracking-tight text-on-surface">
            Fleet Statistics
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Fleet Score */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                <span>Fleet Safety Index</span>
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-on-surface">91.4</span>
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
                  +2.3% <ArrowUpRight size={12} />
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant">Avg across {DRIVERS.length} active drivers</p>
            </motion.div>

            {/* Active Drivers */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                <span>Active Drivers</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Users size={16} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-on-surface">{onlineCount}</span>
                <span className="text-xs text-on-surface-variant">/ {DRIVERS.length} Total</span>
              </div>
              <p className="text-[11px] text-emerald-500 font-semibold">{onlineCount} drivers live in transit</p>
            </motion.div>

            {/* Critical Alerts */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                <span>Active Safety Alerts</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <ShieldAlert size={16} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-rose-500">{alertCount}</span>
                <span className="text-xs font-bold text-rose-500">Requires Review</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">1 fatigue intervention active</p>
            </motion.div>

            {/* Standby / Off-Duty */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                <span>Standby / Off-Duty</span>
                <div className="p-2 rounded-xl bg-surface text-on-surface-variant border border-border">
                  <Clock size={16} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-on-surface">{offlineCount}</span>
                <span className="text-xs text-on-surface-variant">Drivers</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">Scheduled for next shift</p>
            </motion.div>
          </div>
        </section>

        {/* ── DRIVER ROSTER + LIVE ALERT FEED ────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left 2 Cols: Driver Roster Table */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <Users size={18} className="text-primary" /> Driver Roster
                </h2>
                <p className="text-xs text-on-surface-variant">Click any driver to open live monitoring center.</p>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-border">
                {(['all', 'online', 'alert', 'offline'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${
                      filterStatus === st
                        ? 'bg-card text-on-surface shadow-xs border border-border'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search driver name, ID or vehicle..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Driver</th>
                    <th className="py-2.5 px-3">Vehicle</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Safety Score</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDrivers.map(driver => (
                    <tr
                      key={driver.id}
                      onClick={() => navigate('/monitor')}
                      className="hover:bg-surface/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-on-surface group-hover:text-primary transition-colors">
                          {driver.name}
                        </div>
                        <span className="text-[10px] text-on-surface-variant font-mono">{driver.id}</span>
                      </td>

                      <td className="py-3 px-3 font-medium text-on-surface-variant">
                        {driver.vehicle}
                      </td>

                      <td className="py-3 px-3">
                        {driver.status === 'online' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" /> Online
                          </span>
                        )}
                        {driver.status === 'alert' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold text-[10px] border border-rose-500/20">
                            <AlertTriangle size={11} /> Alert
                          </span>
                        )}
                        {driver.status === 'offline' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface text-on-surface-variant font-semibold text-[10px] border border-border">
                            Standby
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono font-bold">
                        <span className={driver.score >= 90 ? 'text-emerald-500' : driver.score >= 80 ? 'text-amber-500' : 'text-rose-500'}>
                          {driver.score}/100
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button className="p-1.5 rounded-lg bg-surface group-hover:bg-primary group-hover:text-white transition-colors text-on-surface-variant">
                          <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right 1 Col: Live Alert Feed */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col">
            <div>
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Activity size={18} className="text-primary" /> Live Alert Feed
              </h2>
              <p className="text-xs text-on-surface-variant">Real-time driver telemetry alerts.</p>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {RECENT_ACTIVITIES.map((act, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-surface border border-border space-y-1 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-on-surface-variant font-bold">{act.time}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${act.color}`}>
                      {act.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-on-surface leading-snug">
                    {act.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </section>
      </main>

      {/* ━━━ INVITATION MODAL (UI Only) ━━━ */}
      <AnimatePresence>
        {inviteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setInviteModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-on-surface">Invite Driver</h3>
                    <p className="text-xs text-on-surface-variant">Invite a driver to join your company.</p>
                  </div>
                </div>
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Driver Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="driver@company.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Driver Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-3 text-on-surface-variant" />
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-1122"
                      value={invitePhone}
                      onChange={e => setInvitePhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Personal Message (Optional)
                  </label>
                  <div className="relative">
                    <MessageSquare size={14} className="absolute left-3 top-3 text-on-surface-variant" />
                    <textarea
                      rows={3}
                      value={inviteMessage}
                      onChange={e => setInviteMessage(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-border bg-surface text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingInvite}
                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-md disabled:opacity-60"
                  >
                    {isSendingInvite ? (
                      <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Sending Invitation...</>
                    ) : (
                      <><Send size={13} /> Send Invitation</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
})

export default BusinessDashboard
