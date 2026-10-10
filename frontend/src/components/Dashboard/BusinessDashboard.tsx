import { memo, useState, useEffect, useCallback } from 'react'
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
  Search,
  ChevronRight,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { driverApi, vehicleApi, type Driver, type Vehicle } from '../../services/fleetApi'

/* ─── Types ───────────────────────────────────── */

/**
 * `status` is whether the driver is enabled in the fleet roster, which is what
 * `Driver.is_active` actually means. It is not a live connection state: nothing
 * in the fleet API reports whether a driver is currently streaming, so this view
 * does not claim one.
 */
interface DriverItem {
  id: string
  name: string
  vehicle: string
  status: 'active' | 'inactive'
}

/**
 * What this view cannot compute and therefore does not show.
 *
 * The fleet API returns driver and vehicle records only. There is no endpoint
 * for per-driver safety scores, fleet-wide alert history, or trip counts, so
 * those are reported as unavailable rather than filled with placeholder values.
 */
const UNAVAILABLE = '—'
const UNAVAILABLE_NOTE = 'Not available: the fleet API returns driver and vehicle records only. A driver safety score is written when one of their rides is ended.'

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



function mapDriverToItem(driver: Driver, vehicles: Vehicle[]): DriverItem {
  const vehicle = vehicles.find(v => v.id === driver.assigned_vehicle_id)
  const vehicleName = vehicle ? `${vehicle.manufacturer || ''} ${vehicle.model || ''} #${vehicle.vehicle_number}`.trim() : 'Unassigned'

  return {
    id: `DRV-${driver.id.toString().padStart(3, '0')}`,
    name: driver.full_name,
    vehicle: vehicleName,
    status: driver.is_active ? 'active' : 'inactive',
  }
}

export default memo(function BusinessDashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Real API data state
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals & form state
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [invitePhone, setInvitePhone] = useState('')
  const [isSendingInvite, setIsSendingInvite] = useState(false)

  // Driver Table search & filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  // Load data from API
  const loadFleetData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        driverApi.list(1, 100),
        vehicleApi.list(1, 100),
      ])
      if (driversRes.success) setDrivers(driversRes.drivers)
      if (vehiclesRes.success) setVehicles(vehiclesRes.vehicles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fleet data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFleetData()
  }, [loadFleetData])

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

  /**
   * Adds a driver to the fleet roster.
   *
   * `driverApi.create` writes the driver record and nothing else: there is no
   * invitation endpoint, so no email leaves the app and the confirmation says
   * the record was created rather than that an invitation was sent.
   */
  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !inviteName) return
    setIsSendingInvite(true)
    try {
      await driverApi.create({
        full_name: inviteName,
        email: inviteEmail,
        phone: invitePhone || undefined,
      })
      toast.success(
        'Driver added',
        `${inviteName} was added to your roster. No invitation email is sent — share their sign-in details separately.`,
      )
      setInviteModalOpen(false)
      setInviteEmail('')
      setInviteName('')
      setInvitePhone('')
      loadFleetData()
    } catch (err) {
      toast.error('Failed to add driver', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsSendingInvite(false)
    }
  }

  // Transform API drivers to UI driver items
  const driverItems = drivers.map(d => mapDriverToItem(d, vehicles))

  const filteredDrivers = driverItems.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || d.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const activeCount = driverItems.filter(d => d.status === 'active').length
  const inactiveCount = driverItems.filter(d => d.status === 'inactive').length
  const unassignedVehicleCount = driverItems.filter(d => d.vehicle === 'Unassigned').length

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
              <UserPlus size={13} />
              <span>Add Driver</span>
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

        {/* ── FLEET OVERVIEW ──
            Every figure below is counted from the fleet API responses on load.
            A fleet-wide safety index, live in-transit count and alert total are
            not shown because no endpoint returns them: the fleet API lists
            driver and vehicle records, and the only ride data available is the
            signed-in user's own rides. */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Drivers on the roster */}
          <div className="p-5 rounded-[16px] bg-surface border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
              <span>DRIVERS ON ROSTER</span>
              <Users size={12} className="text-text-muted" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-text-primary">{driverItems.length}</span>
            </div>
            <p className="text-[11px] text-text-secondary">From GET /api/fleet/drivers</p>
          </div>

          {/* Enabled drivers */}
          <div className="p-5 rounded-[16px] bg-surface border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
              <span>ENABLED</span>
              <span className="w-2 h-2 rounded-full bg-safe" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-safe">{activeCount}</span>
              <span className="text-xs text-text-muted">/ {driverItems.length}</span>
            </div>
            <p className="text-[11px] text-text-secondary">
              Driver.is_active · {inactiveCount} disabled
            </p>
          </div>

          {/* Vehicles */}
          <div className="p-5 rounded-[16px] bg-surface border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
              <span>VEHICLES</span>
              <Radio size={12} className="text-text-muted" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-text-primary">{vehicles.length}</span>
              <span className="text-xs text-text-muted">registered</span>
            </div>
            <p className="text-[11px] text-text-secondary">From GET /api/fleet/vehicles</p>
          </div>

          {/* Fleet-wide safety score: not computable from this API */}
          <div className="p-5 rounded-[16px] bg-surface border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
              <span>FLEET SAFETY SCORE</span>
              <span className="text-text-muted text-[11px] font-bold">N/A</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-text-muted">{UNAVAILABLE}</span>
            </div>
            <p className="text-[11px] text-text-secondary" title={UNAVAILABLE_NOTE}>
              No fleet-wide score endpoint
              {unassignedVehicleCount > 0 ? ` · ${unassignedVehicleCount} driver(s) without a vehicle` : ''}
            </p>
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
                  Driver records and vehicle assignments from your fleet.
                </p>
              </div>

              {/* Roster filters: enabled vs disabled, which is what the API reports */}
              <div className="flex items-center gap-1 bg-card p-1 rounded-[8px] border border-border text-xs">
                {(['all', 'active', 'inactive'] as const).map(st => (
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
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-xs text-text-secondary">Loading drivers...</span>
                </div>
              )}
              {error && !loading && (
                <div className="p-4 text-center text-xs text-warning">
                  {error}
                  <button 
                    onClick={loadFleetData}
                    className="ml-2 text-primary hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loading && !error && (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-muted uppercase tracking-wider text-[10px] font-mono">
                      <th className="pb-2.5 px-3">Driver</th>
                      <th className="pb-2.5 px-3">Vehicle</th>
                      <th className="pb-2.5 px-3">Roster Status</th>
                      <th className="pb-2.5 px-3">Safety Score</th>
                      <th className="pb-2.5 px-3 text-right">Console</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredDrivers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-text-secondary">
                          No drivers found. Click "Invite Driver" or "+ Add Driver" to get started.
                        </td>
                      </tr>
                    ) : filteredDrivers.map(driver => (
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
                          {driver.status === 'active' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-safe/10 text-safe font-mono font-bold text-[10px] border border-safe/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-safe" /> ENABLED
                            </span>
                          )}
                          {driver.status === 'inactive' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-card text-text-muted font-mono text-[10px] border border-border">
                              DISABLED
                            </span>
                          )}
                        </td>

                        {/* Not a real score: the fleet API returns no scores. */}
                        <td className="py-3 px-3 font-mono font-bold" title={UNAVAILABLE_NOTE}>
                          <span className="text-text-muted">{UNAVAILABLE}</span>
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
              )}
            </div>

          </div>

          {/* Right 4 Cols: Fleet Alerts — unavailable, and says so.

              Live Monitoring reports one cabin at a time on the signed-in
              browser's camera. There is no endpoint that aggregates events
              across a fleet, so nothing is listed here rather than a fabricated
              feed being generated from the roster. */}
          <div className="lg:col-span-4 p-6 rounded-[18px] bg-surface border border-white/10 space-y-4">
            <div>
              <h2 className="font-display text-base font-bold text-text-primary">
                Fleet Alerts
              </h2>
              <p className="text-xs text-text-secondary">
                Detection events from monitored rides.
              </p>
            </div>

            <div className="p-4 rounded-[10px] bg-card border border-border/80 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-text-muted flex-shrink-0" />
                <span className="text-xs font-bold text-text-primary">Not available</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Events are recorded against a single ride and read back on that ride's
                report. There is no fleet-wide event feed, so no alert list is shown here.
                Open Live Monitoring to analyse a cabin now.
              </p>
              <button
                onClick={() => navigate('/business/monitoring')}
                className="text-[11px] font-semibold text-brand hover:underline"
              >
                Open Live Monitoring
              </button>
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
                  <h3 className="font-display font-bold text-base text-text-primary">Add Fleet Driver</h3>
                  <p className="text-xs text-text-secondary">
                    Creates a driver record on your roster. No invitation email is sent.
                  </p>
                </div>
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="text-text-muted hover:text-text-primary p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddDriver} className="space-y-4">
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
                    {isSendingInvite ? 'Adding...' : 'Add Driver'}
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
