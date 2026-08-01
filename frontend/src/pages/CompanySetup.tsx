import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2,
  Truck,
  Globe,
  Briefcase,
  ArrowRight,
  Shield,
  CheckCircle2,
} from 'lucide-react'
import { useAuth, type CompanySetupData } from '../context/AuthContext'
import ThemeToggle from '../components/layout/ThemeToggle'

const FLEET_SIZES = ['1–5', '6–20', '21–50', '51–200', '200+']

const INDUSTRIES = [
  'Logistics & Freight',
  'Taxi & Ride Hailing',
  'Bus & Coach',
  'Construction',
  'Mining',
  'Food & Delivery',
  'Healthcare Transport',
  'Government & Municipal',
  'Other',
]

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'UAE', 'Singapore',
  'Australia', 'Canada', 'Germany', 'South Africa', 'Other',
]

const fieldClass =
  'w-full px-4 py-3 rounded-xl border border-border bg-surface text-on-surface text-sm font-medium ' +
  'placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/50 ' +
  'focus:border-primary transition-all duration-150'

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5'

const CompanySetupPage = memo(function CompanySetupPage() {
  const { completeCompanySetup, user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<CompanySetupData>({
    companyName: user?.company || '',
    fleetSize: '',
    country: '',
    industry: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<CompanySetupData>>({})

  const set = (key: keyof CompanySetupData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const validate = (): boolean => {
    const errs: Partial<CompanySetupData> = {}
    if (!form.companyName.trim()) errs.companyName = 'Required'
    if (!form.fleetSize)          errs.fleetSize   = 'Required'
    if (!form.country)            errs.country     = 'Required'
    if (!form.industry)           errs.industry    = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 700))
    completeCompanySetup(form)
    navigate('/fleet', { replace: true })
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
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-lg"
        >
          {/* Heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <Building2 size={26} className="text-primary" />
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight mb-2">
              Set up your company
            </h1>
            <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
              Tell us about your fleet so we can personalise your experience.
              Takes less than a minute.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="h-1.5 w-8 rounded-full bg-primary" />
            <span className="h-1.5 w-8 rounded-full bg-primary" />
            <span className="h-1.5 w-8 rounded-full bg-primary" />
            <span className="h-1.5 w-8 rounded-full bg-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-3xl p-7 shadow-xl space-y-5">
            {/* Company Name */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5"><Building2 size={12} /> Company Name</span>
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={e => set('companyName', e.target.value)}
                placeholder="e.g. Apex Logistics Pvt Ltd"
                className={fieldClass}
                autoFocus
              />
              {errors.companyName && (
                <p className="text-xs text-rose-500 mt-1">{errors.companyName}</p>
              )}
            </div>

            {/* Fleet Size */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5"><Truck size={12} /> Fleet Size (Number of Vehicles)</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {FLEET_SIZES.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => set('fleetSize', size)}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      form.fleetSize === size
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface text-on-surface-variant border-border hover:border-primary/50 hover:text-primary'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {errors.fleetSize && (
                <p className="text-xs text-rose-500 mt-1">{errors.fleetSize}</p>
              )}
            </div>

            {/* Country */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5"><Globe size={12} /> Country</span>
              </label>
              <select
                value={form.country}
                onChange={e => set('country', e.target.value)}
                className={fieldClass + ' cursor-pointer'}
              >
                <option value="">Select country…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.country && (
                <p className="text-xs text-rose-500 mt-1">{errors.country}</p>
              )}
            </div>

            {/* Industry */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5"><Briefcase size={12} /> Industry</span>
              </label>
              <select
                value={form.industry}
                onChange={e => set('industry', e.target.value)}
                className={fieldClass + ' cursor-pointer'}
              >
                <option value="">Select industry…</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              {errors.industry && (
                <p className="text-xs text-rose-500 mt-1">{errors.industry}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 transition-all mt-2"
            >
              {submitting ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Setting up fleet…</>
              ) : (
                <><CheckCircle2 size={16} /> Continue to Fleet Dashboard <ArrowRight size={15} /></>
              )}
            </button>

            <p className="text-center text-xs text-on-surface-variant pt-1">
              You can update these details anytime in <span className="text-primary font-semibold">Settings</span>.
            </p>
          </form>
        </motion.div>
      </main>
    </div>
  )
})

export default CompanySetupPage
