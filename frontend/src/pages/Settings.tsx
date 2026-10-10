import { memo, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Bell,
  Shield,
  Volume2,
  Save,
  User,
  Building2,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { ApiError, settingsApi } from '../services/fleetApi'
import { useToast } from '../context/ToastContext'
import { useAuth, type AccountType } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Button from '../components/shared/Button'

/**
 * These three preferences are stored by GET/PUT /api/settings, but the detection
 * pipeline does not read them: the drowsiness, audio and confirmation rules are
 * fixed constants in the backend, and there is no weekly digest job. They are
 * persisted so the account record is complete, and the UI says plainly which
 * ones currently affect behaviour so "Saved" is not read as "now in effect".
 */
const SettingsPage = memo(function SettingsPage() {
  const [drowsinessSensitivity, setDrowsinessSensitivity] = useState('High')
  const [voiceAlerts, setVoiceAlerts] = useState(true)
  const [emailDigest, setEmailDigest] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const { user, setAccountType, switchWorkspace } = useAuth()
  const navigate = useNavigate()

  const currentType = user?.accountType ?? null

  // Read what is actually stored, so the form shows the saved values rather than
  // defaults that happen to match.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { settings } = await settingsApi.get()
        if (cancelled) return
        setDrowsinessSensitivity(settings.drowsiness_sensitivity)
        setVoiceAlerts(settings.voice_alerts_enabled)
        setEmailDigest(settings.email_digest_enabled)
      } catch (err) {
        if (cancelled) return
        setLoadError(
          err instanceof ApiError
            ? `Could not load your saved settings: ${err.message}`
            : 'Could not load your saved settings.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Persisted for real: only now is it true that the change was saved.
      const { settings } = await settingsApi.update({
        drowsiness_sensitivity: drowsinessSensitivity,
        voice_alerts_enabled: voiceAlerts,
        email_digest_enabled: emailDigest,
      })
      setDrowsinessSensitivity(settings.drowsiness_sensitivity)
      setVoiceAlerts(settings.voice_alerts_enabled)
      setEmailDigest(settings.email_digest_enabled)
      toast.success(
        'Settings Saved',
        'Stored on your account. None of these change detection behaviour in the current build.',
      )
    } catch (err) {
      toast.error(
        'Settings Not Saved',
        err instanceof ApiError
          ? `The server rejected the change: ${err.message}`
          : 'The server could not be reached, so nothing was saved.',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleSwitchType = (type: AccountType) => {
    if (type === currentType) return
    setAccountType(type)
    toast.success(
      type === 'personal' ? 'Switched to Personal' : 'Switched to Business',
      type === 'business'
        ? 'Redirecting to fleet plans…'
        : 'Dashboard set to Personal mode.'
    )
    if (type === 'business') {
      setTimeout(() => navigate('/business/billing'), 800)
    }
  }

  return (
    <div className="w-full h-full max-h-full overflow-y-auto p-4 md:p-8 max-w-[1000px] mx-auto text-on-surface transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        {/* Page title */}
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Settings className="text-primary" size={32} /> Settings & Preferences
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Customize AI detection sensitivity, notifications, and your workspace type.
          </p>
        </div>

        {/* Account Mode Switcher Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <Zap className="text-primary" size={20} />
              <h2 className="text-base font-extrabold text-on-surface">Workspace Account Mode</h2>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-bold border border-primary/20 uppercase tracking-wider">
              Current: {currentType === 'business' ? 'Business Admin' : 'Personal Driver'}
            </span>
          </div>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            Switch between individual personal monitoring mode and fleet business administration mode.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Personal Mode Option */}
            <button
              type="button"
              onClick={() => handleSwitchType('personal')}
              className={`p-4 rounded-xl border text-left transition-all ${
                currentType === 'personal'
                  ? 'bg-primary/10 border-primary ring-1 ring-primary'
                  : 'bg-surface hover:bg-card border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 font-bold text-sm text-on-surface">
                  <User size={18} className="text-emerald-500" /> Personal Driver
                </span>
                {currentType === 'personal' && (
                  <CheckCircle2 size={18} className="text-primary" />
                )}
              </div>
              <p className="text-xs text-on-surface-variant">
                Single-driver AI safety monitoring and personal analytics.
              </p>
            </button>

            {/* Business Mode Option */}
            <button
              type="button"
              onClick={() => handleSwitchType('business')}
              className={`p-4 rounded-xl border text-left transition-all ${
                currentType === 'business'
                  ? 'bg-primary/10 border-primary ring-1 ring-primary'
                  : 'bg-surface hover:bg-card border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 font-bold text-sm text-on-surface">
                  <Building2 size={18} className="text-primary" /> Business Admin
                </span>
                {currentType === 'business' && (
                  <CheckCircle2 size={18} className="text-primary" />
                )}
              </div>
              <p className="text-xs text-on-surface-variant">
                Multi-driver fleet management, vehicle tracking, and reports.
              </p>
            </button>
          </div>

          <div className="pt-2 border-t border-border flex justify-end">
            <button
              type="button"
              onClick={() => {
                switchWorkspace()
                toast.info('Workspace Reset', 'Redirecting to workspace selection screen...')
                navigate('/select-workspace')
              }}
              className="text-xs text-on-surface-variant hover:text-primary underline font-medium"
            >
              Reset Workspace Selection Screen
            </button>
          </div>
        </div>

        {/* Load and save state, stated plainly rather than implied by a toast */}
        {loadError && (
          <div className="p-4 rounded-2xl bg-card border border-danger/30 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger flex-shrink-0 mt-0.5" />
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {loadError} The values below are defaults and have not been confirmed from your
              account.
            </p>
          </div>
        )}

        {/* AI Detection Sensitivity */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-md space-y-6">
          <h2 className="text-lg font-bold text-on-surface border-b border-border pb-4 flex items-center gap-2">
            <Shield className="text-primary" size={20} /> AI Safety Detection Sensitivity
          </h2>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            Stored on your account. The current build detects drowsiness at fixed thresholds, so
            changing this does not alter what is flagged.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Fatigue &amp; Drowsiness Threshold
                <span className="ml-2 font-normal normal-case text-warning">
                  Not applied to detection
                </span>
              </label>
              <select
                value={drowsinessSensitivity}
                onChange={e => setDrowsinessSensitivity(e.target.value)}
                className="w-full md:w-72 px-4 py-2.5 rounded-xl border border-border bg-surface text-on-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="Low">Low (Permissive)</option>
                <option value="Medium">Medium (Balanced)</option>
                <option value="High">High (Recommended for long hauls)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications & Audio */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-md space-y-6">
          <h2 className="text-lg font-bold text-on-surface border-b border-border pb-4 flex items-center gap-2">
            <Bell className="text-primary" size={20} /> Alerts & Sound
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="text-on-surface-variant" size={20} />
                <div>
                  <p className="text-sm font-semibold text-on-surface">Audio Alert Tone</p>
                  <p className="text-xs text-on-surface-variant">
                    Stored on your account. The in-app alert tone is currently controlled by the
                    sound toggle on the monitoring screen, not by this setting.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={voiceAlerts}
                onChange={e => setVoiceAlerts(e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-3">
                <Bell className="text-on-surface-variant" size={20} />
                <div>
                  <p className="text-sm font-semibold text-on-surface">Email Safety Digests</p>
                  <p className="text-xs text-on-surface-variant">
                    Stored on your account. No digest emails are sent in the current build, and
                    ride reports are generated on request rather than on a schedule.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailDigest}
                onChange={e => setEmailDigest(e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Save: writes to /api/settings, so success here means it was persisted. */}
        <div className="flex justify-end pt-4">
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {loading ? 'Loading…' : saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </motion.div>
    </div>
  )
})

export default SettingsPage
