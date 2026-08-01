import { memo, useState } from 'react'
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
  ArrowRight,
} from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useAuth, type AccountType } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Button from '../components/shared/Button'

const SettingsPage = memo(function SettingsPage() {
  const [drowsinessSensitivity, setDrowsinessSensitivity] = useState('High')
  const [voiceAlerts, setVoiceAlerts] = useState(true)
  const [emailDigest, setEmailDigest] = useState(true)
  const toast = useToast()
  const { user, setAccountType } = useAuth()
  const navigate = useNavigate()

  const currentType = user?.accountType ?? null

  const handleSave = () => {
    toast.success('Settings Saved', 'Your safety preferences have been updated.')
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
      setTimeout(() => navigate('/enterprise'), 800)
    }
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background text-on-surface pt-24 pb-16 px-4 md:px-12 max-w-[1000px] mx-auto transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          {/* Page title */}
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Settings className="text-primary" size={28} /> Settings
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Manage your account, AI preferences and notification settings.
            </p>
          </div>

          {/* ── Account Type ───────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2 mb-1">
                <User size={18} className="text-primary" /> Account Type
              </h2>
              <p className="text-xs text-on-surface-variant">
                Change how you use DriverGuard AI. You can switch between Personal and Business at any time.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Personal */}
              <button
                onClick={() => handleSwitchType('personal')}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all hover:shadow-lg ${
                  currentType === 'personal'
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-border bg-surface hover:border-emerald-500/50'
                }`}
              >
                {currentType === 'personal' && (
                  <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={13} /> Current
                  </span>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <User size={17} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">Personal Driver</p>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">FREE</span>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  AI monitoring for yourself. Ideal for individuals and personal vehicles.
                </p>
              </button>

              {/* Business */}
              <button
                onClick={() => handleSwitchType('business')}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all hover:shadow-lg ${
                  currentType === 'business'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-surface hover:border-primary/50'
                }`}
              >
                {currentType === 'business' && (
                  <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-primary">
                    <CheckCircle2 size={13} /> Current
                  </span>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Building2 size={17} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">Business / Fleet</p>
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">PREMIUM</span>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Manage multiple drivers and vehicles. For companies and fleets.
                </p>
              </button>
            </div>

            {/* Current plan and upgrade CTA */}
            <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-bold text-on-surface mb-0.5">Current Plan</p>
                <p className="text-sm font-semibold text-on-surface-variant">
                  {currentType === 'personal' ? '✅ Personal — Free Forever' : currentType === 'business' ? '🏢 Business — Premium' : '⚠️ Not set — Complete onboarding'}
                </p>
              </div>
              {currentType === 'personal' && (
                <button
                  onClick={() => navigate('/enterprise')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  <Zap size={13} /> Upgrade to Business <ArrowRight size={13} />
                </button>
              )}
              {!currentType && (
                <button
                  onClick={() => navigate('/onboarding')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Complete Setup <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* ── AI Settings ─────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            {/* Sensitivity */}
            <div className="space-y-4 border-b border-border pb-6">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Shield size={18} className="text-primary" /> AI Detection Sensitivity
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['Low', 'Medium', 'High'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setDrowsinessSensitivity(level)}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-semibold transition-all ${
                      drowsinessSensitivity === level
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface text-on-surface-variant border-border hover:bg-card'
                    }`}
                  >
                    {level} Sensitivity
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Alerts */}
            <div className="space-y-4 border-b border-border pb-6">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Volume2 size={18} className="text-primary" /> In-Cabin Voice Alerts
              </h2>
              <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-surface border border-border">
                <span className="text-xs font-medium text-on-surface">Enable spoken voice alerts to driver</span>
                <input
                  type="checkbox"
                  checked={voiceAlerts}
                  onChange={(e) => setVoiceAlerts(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </label>
            </div>

            {/* Email Digest */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Bell size={18} className="text-primary" /> Email Notifications
              </h2>
              <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-surface border border-border">
                <span className="text-xs font-medium text-on-surface">Send daily safety summary report</span>
                <input
                  type="checkbox"
                  checked={emailDigest}
                  onChange={(e) => setEmailDigest(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </label>
            </div>

            {/* Save */}
            <div className="pt-2">
              <Button variant="primary" size="md" onClick={handleSave} className="flex items-center gap-2">
                <Save size={16} /> Save Preferences
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  )
})

export default SettingsPage
