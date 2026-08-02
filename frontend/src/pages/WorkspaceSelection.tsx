import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Shield,
  User,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Check,
} from 'lucide-react'
import { useAuth, type AccountType } from '../context/AuthContext'
import Button from '../components/shared/Button'
import ThemeToggle from '../components/layout/ThemeToggle'

const PERSONAL_FEATURES = [
  'Personal AI Monitoring',
  'Driver Safety Score',
  'Fatigue Detection',
  'Phone Usage Detection',
  'Seat Belt Monitoring',
  'Driving Reports',
  'Unlimited Personal Use',
]

const BUSINESS_FEATURES = [
  'Fleet Dashboard',
  'Live Monitoring',
  'Invite Drivers',
  'Vehicle Management',
  'Company Reports',
  'Analytics',
  'Billing',
]

export default function WorkspaceSelection() {
  const { user, setAccountType } = useAuth()
  const navigate = useNavigate()

  // Selection state - null until user clicks one card
  const [selectedType, setSelectedType] = useState<AccountType | null>(
    user?.accountType ? user.accountType : null
  )

  const handleContinue = () => {
    if (!selectedType) return
    setAccountType(selectedType)
    const target = selectedType === 'business' ? '/business/dashboard' : '/personal/dashboard'
    navigate(target, { replace: true })
  }

  return (
    <div className="w-screen h-screen max-h-screen overflow-y-auto bg-gradient-to-b from-background via-surface/40 to-background text-on-surface flex flex-col justify-between transition-colors duration-300 relative">
      
      {/* Background Radial Glow Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute -bottom-40 right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[130px]" />
      </div>

      {/* Top Header Navigation */}
      <header className="w-full px-6 md:px-12 py-5 flex items-center justify-between z-20">
        <Link
          to="/"
          className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded group"
        >
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-105 transition-transform">
            <Shield className="text-primary" size={22} />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight text-on-surface">
            DriverGuard <span className="text-primary font-normal">AI</span>
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Workspace Selection Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 z-10 w-full max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-center space-y-2 mb-8 max-w-xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold border border-primary/20 uppercase tracking-wider">
            <Sparkles size={13} /> Setup Workspace
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">
            Choose Your Workspace
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Select how you want to use DriverGuard AI. You can change this later from Settings.
          </p>
        </motion.div>

        {/* ━━━ TWO LARGE MODERN CARDS ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
          
          {/* CARD 1: PERSONAL DRIVER */}
          <motion.div
            whileHover={{ y: -6, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setSelectedType('personal')}
            className={`cursor-pointer rounded-3xl p-6 sm:p-8 border transition-all duration-300 relative flex flex-col justify-between ${
              selectedType === 'personal'
                ? 'bg-card border-primary ring-2 ring-primary/40 shadow-xl shadow-primary/10'
                : 'bg-card/80 backdrop-blur-xl border-border hover:border-primary/50 shadow-md'
            }`}
          >
            {/* Top Selection Icon Indicator */}
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <User size={24} />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold border border-emerald-500/20">
                  FREE
                </span>
                {selectedType === 'personal' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center shadow-md"
                  >
                    <CheckCircle2 size={16} />
                  </motion.div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-on-surface tracking-tight flex items-center gap-2">
                Personal Driver
              </h2>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Perfect for individual drivers.
              </p>

              {/* Feature Checklist */}
              <div className="mt-6 space-y-2.5">
                {PERSONAL_FEATURES.map(feat => (
                  <div key={feat} className="flex items-center gap-2.5 text-xs text-on-surface">
                    <div className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Check size={11} />
                    </div>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border/60">
              <button
                type="button"
                className={`w-full py-3 rounded-xl text-xs font-extrabold transition-all ${
                  selectedType === 'personal'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-surface hover:bg-card border border-border text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Continue as Personal
              </button>
            </div>
          </motion.div>

          {/* CARD 2: FLEET / BUSINESS */}
          <motion.div
            whileHover={{ y: -6, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setSelectedType('business')}
            className={`cursor-pointer rounded-3xl p-6 sm:p-8 border transition-all duration-300 relative flex flex-col justify-between ${
              selectedType === 'business'
                ? 'bg-card border-primary ring-2 ring-primary/40 shadow-xl shadow-primary/10'
                : 'bg-card/80 backdrop-blur-xl border-border hover:border-primary/50 shadow-md'
            }`}
          >
            {/* Top Selection Icon Indicator */}
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Building2 size={24} />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold border border-primary/20">
                  PAID
                </span>
                {selectedType === 'business' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center shadow-md"
                  >
                    <CheckCircle2 size={16} />
                  </motion.div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-on-surface tracking-tight flex items-center gap-2">
                Fleet / Business
              </h2>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Manage drivers and company fleets.
              </p>

              {/* Feature Checklist */}
              <div className="mt-6 space-y-2.5">
                {BUSINESS_FEATURES.map(feat => (
                  <div key={feat} className="flex items-center gap-2.5 text-xs text-on-surface">
                    <div className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Check size={11} />
                    </div>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border/60">
              <button
                type="button"
                className={`w-full py-3 rounded-xl text-xs font-extrabold transition-all ${
                  selectedType === 'business'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-surface hover:bg-card border border-border text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Continue as Business
              </button>
            </div>
          </motion.div>

        </div>

        {/* ━━━ MAIN CONTINUE BUTTON ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={!selectedType}
            onClick={handleContinue}
            className="w-full shadow-lg py-3.5 text-sm"
          >
            <span className="flex items-center justify-center gap-2">
              Continue to Workspace <ArrowRight size={16} />
            </span>
          </Button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-on-surface-variant border-t border-border/50 z-20">
        © {new Date().getFullYear()} DriverGuard AI. Encrypted 256-bit Protection.
      </footer>

    </div>
  )
}
