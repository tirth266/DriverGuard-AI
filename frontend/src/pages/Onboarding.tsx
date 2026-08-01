import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Building2,
  CheckCircle2,
  ArrowRight,
  Shield,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/layout/ThemeToggle'

const PERSONAL_FEATURES = [
  'AI Driver Monitoring',
  'Phone Detection',
  'Drowsiness Detection',
  'Smoking Detection',
  'Seat Belt Detection',
  'Live Camera Feed',
  'Personal Dashboard',
  'Unlimited Personal Use',
]

const BUSINESS_FEATURES = [
  'Multi-Driver Dashboard',
  'Fleet Management',
  'Driver Analytics & Reports',
  'Live Alerts System',
  'Company Management',
  'Team Member Access',
  'Vehicle Management',
  'Priority Support',
]

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.15, ease: 'easeOut' as const },
  }),
}

const OnboardingPage = memo(function OnboardingPage() {
  const { user, setAccountType } = useAuth()
  const navigate = useNavigate()
  const [selecting, setSelecting] = useState<'personal' | 'business' | null>(null)

  const handleSelect = async (type: 'personal' | 'business') => {
    setSelecting(type)
    // Small delay for a smooth feel
    await new Promise(r => setTimeout(r, 350))
    setAccountType(type)
    if (type === 'personal') {
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/enterprise', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col transition-colors duration-300">
      {/* Minimal header */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield size={17} className="text-primary" />
          </div>
          <span className="font-display font-extrabold text-base tracking-tight">
            DriverGuard <span className="text-primary font-normal">AI</span>
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 max-w-xl"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
            <CheckCircle2 size={13} /> One-time Setup
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            How will you use
            <span className="text-primary"> DriverGuard AI</span>?
          </h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            {user?.name ? `Welcome, ${user.name.split(' ')[0]}! ` : ''}
            Choose the account type that best fits your needs. You can change this anytime in Settings.
          </p>
        </motion.div>

        {/* Two cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Personal Card */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <button
              onClick={() => handleSelect('personal')}
              disabled={!!selecting}
              className={`w-full text-left p-7 rounded-3xl border-2 transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary relative overflow-hidden ${
                selecting === 'personal'
                  ? 'border-primary bg-primary/5 scale-[0.99]'
                  : 'border-border bg-card hover:border-primary/60 hover:shadow-2xl hover:shadow-primary/5'
              }`}
            >
              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider border border-emerald-500/20 mb-5">
                FREE FOREVER
              </span>

              {/* Icon + title */}
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <User size={22} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-on-surface">Personal Driver</h2>
                  <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
                    Monitor yourself while driving. Perfect for students, daily commuters and personal vehicles.
                  </p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {PERSONAL_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Price */}
              <div className="flex items-end gap-1 mb-5">
                <span className="text-3xl font-extrabold text-on-surface font-mono">₹0</span>
                <span className="text-sm text-on-surface-variant mb-1">/ forever</span>
              </div>

              {/* CTA */}
              <div className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm transition-all ${
                selecting === 'personal'
                  ? 'bg-primary text-white'
                  : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
              }`}>
                {selecting === 'personal' ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Setting up…</>
                ) : (
                  <>Continue Free <ArrowRight size={16} /></>
                )}
              </div>
            </button>
          </motion.div>

          {/* Business Card */}
          <motion.div
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <button
              onClick={() => handleSelect('business')}
              disabled={!!selecting}
              className={`w-full text-left p-7 rounded-3xl border-2 transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary relative overflow-hidden ${
                selecting === 'business'
                  ? 'border-primary bg-primary/5 scale-[0.99]'
                  : 'border-border bg-card hover:border-primary/60 hover:shadow-2xl hover:shadow-primary/5'
              }`}
            >
              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider border border-primary/20 mb-5">
                PREMIUM
              </span>

              {/* Icon + title */}
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Building2 size={22} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-on-surface">Business / Fleet</h2>
                  <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
                    Manage drivers across your company. Ideal for logistics, taxi services and transport businesses.
                  </p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {BUSINESS_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <CheckCircle2 size={14} className="text-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Price hint */}
              <div className="flex items-end gap-1 mb-5">
                <span className="text-3xl font-extrabold text-on-surface font-mono">₹999</span>
                <span className="text-sm text-on-surface-variant mb-1">/ month · starts at</span>
              </div>

              {/* CTA */}
              <div className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm transition-all ${
                selecting === 'business'
                  ? 'bg-primary text-white'
                  : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
              }`}>
                {selecting === 'business' ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Loading plans…</>
                ) : (
                  <>View Plans <ArrowRight size={16} /></>
                )}
              </div>
            </button>
          </motion.div>
        </div>

        <p className="mt-8 text-xs text-on-surface-variant text-center max-w-sm">
          You can switch between account types anytime from{' '}
          <span className="text-primary font-semibold">Settings → Account Type</span>.
        </p>
      </main>
    </div>
  )
})

export default OnboardingPage
