import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Bell, Shield, Volume2, Save } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import MainLayout from '../layouts/MainLayout'
import Button from '../components/shared/Button'

const SettingsPage = memo(function SettingsPage() {
  const [drowsinessSensitivity, setDrowsinessSensitivity] = useState('High')
  const [voiceAlerts, setVoiceAlerts] = useState(true)
  const [emailDigest, setEmailDigest] = useState(true)
  const toast = useToast()

  const handleSave = () => {
    toast.success('Settings Saved', 'Your fleet safety preferences have been updated.')
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
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Settings className="text-primary" size={28} /> Fleet Safety Settings
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Configure real-time AI alert sensitivity, notification thresholds, and voice alerts.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            {/* AI Alert Sensitivity */}
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

            {/* Voice Alert Options */}
            <div className="space-y-4 border-b border-border pb-6">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Volume2 size={18} className="text-primary" /> In-Cabin Voice Alerts
              </h2>
              <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-surface border border-border">
                <span className="text-xs font-medium text-on-surface">Enable instant spoken voice alerts to driver</span>
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
                <span className="text-xs font-medium text-on-surface">Send daily safety summary report to fleet manager</span>
                <input
                  type="checkbox"
                  checked={emailDigest}
                  onChange={(e) => setEmailDigest(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </label>
            </div>

            {/* Save Button */}
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
