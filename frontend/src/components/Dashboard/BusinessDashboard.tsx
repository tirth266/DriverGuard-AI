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
  Clock,
  Search,
  ChevronRight,
  X,
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
  { id: 'DRV-102', name: 'Marcus Vance', vehicle: 'Kenworth T680 #2014', status: 'alert', score: 74, lastAlert: 'Fatigue warning 12m ago', tripsToday: 3 },
  { id: 'DRV-103', name: 'Elena Rostova', vehicle: 'Volvo VNL 860 #1093', status: 'online', score: 95, tripsToday: 5 },
  { id: 'DRV-104', name: 'David Miller', vehicle: 'Peterbilt 579 #3021', status: 'offline', score: 91, tripsToday: 2 },
  { id: 'DRV-105', name: 'Samantha Reed', vehicle: 'Mack Anthem #5012', status: 'online', score: 99, tripsToday: 6 },
]

const RECENT_ACTIVITIES = [
  { time: '11:15 AM', type: 'alert', text: 'Fatigue alert flagged for Marcus Vance (Kenworth #2014)', color: 'text-warning' },
  { time: '11:02 AM', type: 'safe', text: 'Safe Driving Restored: Elena Rostova (Volvo #1093)', color: 'text-safe' },
  { time: '10:45 AM', type: 'info', text: 'Shift Started: Samantha Reed assigned to Mack Anthem #5012', color: 'text-brand' },
  { time: '10:12 AM', type: 'alert', text: 'Phone Usage Resolved: John Driver (Cascadia #4082)', color: 'text-safe' },
]

/* ─── Sidebar Nav Items ───────────────────────────────────── */

const SIDEBAR_ITEMS = [
  { label: 'Fleet Overview', icon: LayoutDashboard, path: '/business/dashboard' },
  { label: 'Driver Roster', icon: Users, path: '/business/drivers' },
  { label: 'Live Monitoring', icon: Radio, path: '/business/monitoring' },
  { label: 'Compliance Reports', icon: FileText, path: '/business/reports' },
  { label: 'Company Profile', icon: Building2, path: '/business/company' },
  { label: 'Billing & Plan', icon: CreditCard, path: '/business/billing' },
  { label: 'Settings', icon: Settings, path: '/business/settings' },
]

const DEFAULT_INVITE_MESSAGE =
  'Welcome to DriverGuard AI.\nClick the link below to connect your driver credentials.'

export default memo(function BusinessDashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Modals & form state
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [invitePhone, setInvitePhone] = useState('')
  const [inviteMessage, setInviteMessage] = useState(DEFAULT_INVITE_MESSAGE)
  const [isSendingInvite, setIsSendingInvite] = useState(false)

  // Driver Table search & filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'alert'>('all')

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
    await new Promise(r => setTimeout(r, 600))
    setIsSendingInvite(false)
    setInviteModalOpen(false)
    toast.success('Invitation delivered.', `Link dispatched to ${inviteEmail}`)
    setInviteEmail('')
    setInviteName('')
    setInvitePhone('')
    setInviteMessage(DEFAULT_INVITE_MESSAGE)
  }

  const filteredDrivers = DRIVERS.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || d.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const onlineCount = DRIVERS.filter(d => d.status === 'online').length
  const alertCount = DRIVERS.filter(d => d.status === 'alert').length
  const offlineCount = DRIVERS.filter(d => d.status === 'offline').length

  return (
    <div className="flex w-full h-full overflow-hidden bg-background text-text-primary">

      {/* ━━━ FLEET ADMIN SIDEBAR ━━━ */}
      <aside
        className={`hidden md:flex flex-col justify-between bg-surface border-r border-border h-full flex-shrink-0 z-30 transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-56'
        }`}
      >
        <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
          {!sidebarCollapsed && (
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted px-2">
              Fleet Console
            </span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-[6px] border border-border bg-card hover:bg-surface text-text-secondary hover:text-text-primary transition-colors mx-auto"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        </div>

        <nav className="p-2 space-y-1 overflow-y-auto flex-1">
          {SIDEBAR_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        <div className="p-3 border-t border-border flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-xs font-medium text-danger hover:bg-danger/10 transition-colors text-left"
            title={sidebarCollapsed ? 'Sign out' : undefined}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ━━━ MAIN SCROLLABLE CONTENT ━━━ */}
      <main className="flex-1 w-full h-full overflow-y-auto p-6 md:p-8 space-y-8">

        {/* ── TOP HEADER & QUICK CONTROLS ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-safe" />
              <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                Fleet Operations
              </span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-text-primary mt-1">
              Safety Command Center
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setInviteModalOpen(true)}
              className="px-3.5 py-2 rounded-[10px] border border-border bg-surface hover:bg-surface-hover text-xs font-medium text-text-primary flex items-center gap-1.5 transition-colors"
            >
              <Mail size={13} />
              <span>Invite Driver</span>
            </button>
            <button
              onClick={() => navigate('/business/drivers/add')}
              className="px-3.5 py-2 rounded-[10px] border border-border bg-surface hover:bg-surface-hover text-xs font-medium text-text-primary flex items-center gap-1.5 transition-colors"
            >
              <UserPlus size={13} />
              <span>+ Add Driver</span>
            </button>
            <button
              onClick={() => navigate('/business/monitoring')}
              className="px-4 py-2 rounded-[10px] bg-brand text-white hover:bg-brand/90 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Radio size={13} className="animate-pulse" />
              <span>Launch Live Monitor</span>
            </button>
          </div>
        </div>

        {/* ── ACTIVE CRITICAL ALERT BANNER (If alert exists) ── */}
        {alertCount > 0 && (
          <div className="p-4 rounded-[14px] border border-warning/30 bg-warning/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[8px] bg-warning/15 text-warning flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary">
                  1 Active Alert Requires Attention
                </p>
                <p className="text-[11px] text-text-secondary">
                  Marcus Vance (Kenworth T680 #2014) triggered fatigue rest alert 12m ago.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/business/monitoring')}
              className="px-3 py-1.5 rounded-[8px] bg-warning text-black text-xs font-bold hover:opacity-90 flex-shrink-0"
            >
              View Feed
            </button>
          </div>
        )}

        {/* ── STATISTICAL FLEET OVERVIEW ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Dominant Metric: Fleet Safety Index */}
          <div className="p-5 rounded-[16px] bg-surface border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
              <span>FLEET SAFETY INDEX</span>
              <span className="text-safe text-[11px] font-bold">↑ +2.3%</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-text-primary">91.4%</span>
            </div>
            <p className="text-[11px] text-text-secondary">Across {DRIVERS.length} registered vehicles</p>
          </div>

          {/* Active Drivers */}
          <div className="p-5 rounded-[16px] bg-surface border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
              <span>ACTIVE IN TRANSIT</span>
              <span className="w-2 h-2 rounded-full bg-safe" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-safe">{onlineCount}</span>
              <span className="text-xs text-text-muted">/ {DRIVERS.length} total</span>
            </div>
            <p className="text-[11px] text-text-secondary">Live telemetry streaming</p>
          </div>

          {/* Critical Alerts */}
          <div className="p-5 rounded-[16px] bg-surface border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
              <span>FLAGGED INTERVENTIONS</span>
              <span className="text-warning text-xs font-bold">{alertCount}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-warning">{alertCount}</span>
              <span className="text-xs text-text-muted">requiring action</span>
            </div>
            <p className="text-[11px] text-text-secondary">Zero high-speed incidents</p>
          </div>

          {/* Standby / Off-Duty */}
          <div className="p-5 rounded-[16px] bg-surface border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
              <span>OFF-DUTY STANDBY</span>
              <Clock size={12} className="text-text-muted" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-text-primary">{offlineCount}</span>
              <span className="text-xs text-text-muted">drivers</span>
            </div>
            <p className="text-[11px] text-text-secondary">Scheduled for next rotation</p>
          </div>

        </section>

        {/* ── DRIVER ROSTER & LIVE EVENT STREAM ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left 8 Cols: Driver Roster */}
          <div className="lg:col-span-8 p-6 rounded-[18px] bg-surface border border-white/10 space-y-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-text-primary">
                  Driver Roster
                </h2>
                <p className="text-xs text-text-secondary">
                  Real-time driver compliance scores and vehicle assignments.
                </p>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 bg-card p-1 rounded-[8px] border border-border text-xs">
                {(['all', 'online', 'alert', 'offline'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium capitalize transition-colors ${
                      filterStatus === st
                        ? 'bg-surface text-text-primary border border-border shadow-xs'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search driver name, ID or vehicle model..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-[8px] border border-border bg-card text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand"
              />
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-text-muted uppercase tracking-wider text-[10px] font-mono">
                    <th className="pb-2.5 px-3">Driver</th>
                    <th className="pb-2.5 px-3">Vehicle</th>
                    <th className="pb-2.5 px-3">Status</th>
                    <th className="pb-2.5 px-3">Safety Score</th>
                    <th className="pb-2.5 px-3 text-right">Console</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredDrivers.map(driver => (
                    <tr
                      key={driver.id}
                      onClick={() => navigate('/business/monitoring')}
                      className="hover:bg-white/5 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3">
                        <div className="font-semibold text-text-primary group-hover:text-brand transition-colors">
                          {driver.name}
                        </div>
                        <span className="text-[10px] text-text-muted font-mono">{driver.id}</span>
                      </td>

                      <td className="py-3 px-3 text-text-secondary font-medium">
                        {driver.vehicle}
                      </td>

                      <td className="py-3 px-3">
                        {driver.status === 'online' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-safe/10 text-safe font-mono font-bold text-[10px] border border-safe/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-safe" /> ONLINE
                          </span>
                        )}
                        {driver.status === 'alert' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-warning/10 text-warning font-mono font-bold text-[10px] border border-warning/30">
                            <AlertTriangle size={11} /> ATTENTION
                          </span>
                        )}
                        {driver.status === 'offline' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-card text-text-muted font-mono text-[10px] border border-border">
                            OFF-DUTY
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono font-bold">
                        <span className={driver.score >= 90 ? 'text-safe' : driver.score >= 80 ? 'text-warning' : 'text-danger'}>
                          {driver.score}%
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button className="p-1.5 rounded-[6px] bg-card group-hover:bg-brand group-hover:text-white transition-colors text-text-secondary">
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* Right 4 Cols: Live Alert Feed */}
          <div className="lg:col-span-4 p-6 rounded-[18px] bg-surface border border-white/10 space-y-4">
            <div>
              <h2 className="font-display text-base font-bold text-text-primary">
                Live Alert Feed
              </h2>
              <p className="text-xs text-text-secondary">
                Real-time edge detections from in-cabin cameras.
              </p>
            </div>

            <div className="space-y-2.5">
              {RECENT_ACTIVITIES.map((act, i) => (
                <div
                  key={i}
                  className="p-3 rounded-[10px] bg-card border border-border/80 space-y-1 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-text-muted">{act.time}</span>
                    <span className={`font-bold uppercase tracking-wider ${act.color}`}>
                      {act.type}
                    </span>
                  </div>
                  <p className="text-xs text-text-primary leading-snug font-medium">
                    {act.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </section>

      </main>

      {/* ━━━ INVITATION MODAL ━━━ */}
      <AnimatePresence>
        {inviteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setInviteModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-white/12 rounded-[20px] p-6 shadow-2xl max-w-md w-full space-y-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-display font-bold text-base text-text-primary">Invite Fleet Driver</h3>
                  <p className="text-xs text-text-secondary">Send an activation link to onboard driver telemetry.</p>
                </div>
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="text-text-muted hover:text-text-primary p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">
                    Driver Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="driver@logistics.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] border border-border bg-card text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] border border-border bg-card text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 019-2834"
                    value={invitePhone}
                    onChange={e => setInvitePhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] border border-border bg-card text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">
                    Custom Note (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={inviteMessage}
                    onChange={e => setInviteMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] border border-border bg-card text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="px-3.5 py-2 rounded-[8px] border border-border text-xs font-medium text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingInvite}
                    className="px-4 py-2 rounded-[8px] bg-brand text-white text-xs font-bold hover:bg-brand/90 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSendingInvite ? 'Sending...' : 'Send Invitation'}
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
