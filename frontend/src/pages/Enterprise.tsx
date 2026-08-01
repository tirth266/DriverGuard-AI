import { memo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Shield,
  CheckCircle2,
  ArrowRight,
  Building2,
  Zap,
  Users,
  BarChart3,
  HeadphonesIcon,
  Sparkles,
} from 'lucide-react'
import ThemeToggle from '../components/layout/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

/* ─── Plan data ──────────────────────────────────────────── */

const PLANS = [
  {
    id: 'personal',
    name: 'Personal',
    subtitle: 'For solo drivers',
    price: '₹0',
    cycle: 'FREE FOREVER',
    highlight: false,
    badge: null,
    icon: Shield,
    color: 'text-emerald-500',
    border: 'border-border',
    features: [
      'AI Driver Monitoring',
      'Phone Detection',
      'Drowsiness Alerts',
      'Seat Belt Detection',
      'Smoking Detection',
      'Live Camera Dashboard',
      '1 Driver / 1 Vehicle',
      'Unlimited Personal Use',
    ],
    cta: 'Current Plan',
    ctaStyle: 'bg-surface border border-border text-on-surface-variant cursor-default',
  },
  {
    id: 'fleet-basic',
    name: 'Fleet Basic',
    subtitle: 'Up to 10 drivers',
    price: '₹999',
    cycle: 'per month',
    highlight: false,
    badge: null,
    icon: Users,
    color: 'text-primary',
    border: 'border-primary/30',
    features: [
      'Everything in Personal',
      'Up to 10 Drivers',
      'Multi-Driver Dashboard',
      'Fleet Management Console',
      'Driver Safety Scores',
      'Basic Alert Reports',
      'Email Notifications',
      'Standard Support',
    ],
    cta: 'Get Fleet Basic',
    ctaStyle: 'bg-primary text-white hover:opacity-90',
  },
  {
    id: 'fleet-pro',
    name: 'Fleet Pro',
    subtitle: 'Up to 50 drivers',
    price: '₹4,999',
    cycle: 'per month',
    highlight: true,
    badge: 'Most Popular',
    icon: Zap,
    color: 'text-primary',
    border: 'border-primary',
    features: [
      'Everything in Fleet Basic',
      'Up to 50 Drivers',
      'Advanced Analytics',
      'Full Reports Suite',
      'Vehicle Management',
      'Company Administration',
      'Team Member Access',
      'Priority Support',
    ],
    cta: 'Get Fleet Pro',
    ctaStyle: 'bg-primary text-white hover:opacity-90',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Custom fleet size',
    price: 'Custom',
    cycle: 'contact sales',
    highlight: false,
    badge: 'Custom',
    icon: Building2,
    color: 'text-purple-500',
    border: 'border-purple-500/30',
    features: [
      'Unlimited Drivers & Fleets',
      'Custom AI Training Model',
      'On-Premise Deployment',
      'Dedicated Account Manager',
      'Custom API & Webhooks',
      'SLA Guarantees',
      'SSO & SAML Auth',
      '24/7 Phone Support',
    ],
    cta: 'Contact Sales',
    ctaStyle: 'bg-purple-600 text-white hover:bg-purple-700',
  },
]

const ENTERPRISE_FEATURES = [
  { icon: Building2, title: 'Multi-Driver Dashboard', desc: 'Monitor all your drivers from a single command center.' },
  { icon: BarChart3, title: 'Advanced Analytics', desc: 'Deep insights into driver behavior, safety trends and compliance.' },
  { icon: Users, title: 'Team Management', desc: 'Manage roles, access levels and responsibilities across your fleet.' },
  { icon: HeadphonesIcon, title: 'Priority Support', desc: 'Dedicated account manager and 24/7 priority technical support.' },
]

/* ─── Enterprise / Pricing Page ──────────────────────────── */

const EnterprisePage = memo(function EnterprisePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-border flex-shrink-0 sticky top-0 bg-surface/80 backdrop-blur-md z-40">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield size={17} className="text-primary" />
          </div>
          <span className="font-display font-extrabold text-base tracking-tight">
            DriverGuard <span className="text-primary font-normal">AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user && (
            <button onClick={() => navigate('/dashboard')}
              className="text-xs font-semibold text-primary hover:underline">
              Go to Dashboard →
            </button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 px-4 text-center max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-5">
              <Sparkles size={13} /> Business & Fleet Plans
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Scale Your Fleet Safety
            </h1>
            <p className="text-on-surface-variant text-base leading-relaxed max-w-xl mx-auto">
              From a single vehicle to an entire national fleet — DriverGuard AI grows with your business.
              Choose the plan that fits your scale.
            </p>
          </motion.div>
        </section>

        {/* Pricing Cards */}
        <section className="px-4 pb-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan, i) => {
              const Icon = plan.icon
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' as const }}
                  className={`relative bg-card border-2 ${plan.border} rounded-3xl p-6 flex flex-col transition-all hover:shadow-xl ${
                    plan.highlight ? 'shadow-2xl shadow-primary/10' : ''
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-white text-[11px] font-bold uppercase tracking-wider shadow-md">
                      {plan.badge}
                    </span>
                  )}

                  <div className={`h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 ${plan.color}`}>
                    <Icon size={20} />
                  </div>

                  <div className="mb-1">
                    <h2 className="text-lg font-extrabold text-on-surface">{plan.name}</h2>
                    <p className="text-xs text-on-surface-variant">{plan.subtitle}</p>
                  </div>

                  <div className="flex items-end gap-1 my-4">
                    <span className="text-3xl font-extrabold text-on-surface font-mono">{plan.price}</span>
                    <span className="text-xs text-on-surface-variant mb-1">{plan.cycle}</span>
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <CheckCircle2 size={13} className={plan.color + ' flex-shrink-0'} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${plan.ctaStyle}`}>
                    {plan.cta}
                    {plan.id !== 'personal' && <ArrowRight size={15} />}
                  </button>
                </motion.div>
              )
            })}
          </div>

          <p className="text-center text-xs text-on-surface-variant mt-8">
            All prices in INR. Annual billing available at 20% discount. Cancel anytime.
          </p>
        </section>

        {/* Enterprise Feature Highlights */}
        <section className="bg-surface border-t border-border py-20 px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="font-display text-3xl font-extrabold tracking-tight mb-3">Everything your fleet needs</h2>
            <p className="text-on-surface-variant text-sm">Built for operations teams, safety managers and logistics companies.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {ENTERPRISE_FEATURES.map((feat, i) => {
              const Icon = feat.icon
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.08, ease: 'easeOut' as const }}
                  className="flex gap-4 p-6 bg-card border border-border rounded-2xl hover:border-primary/40 transition-colors"
                >
                  <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-on-surface mb-1">{feat.title}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{feat.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* CTA footer */}
        <section className="py-20 px-4 text-center">
          <h2 className="font-display text-2xl font-extrabold tracking-tight mb-3">
            Not sure which plan?
          </h2>
          <p className="text-on-surface-variant text-sm mb-6 max-w-md mx-auto">
            Start with Personal for free and upgrade to Fleet when you're ready. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button onClick={() => navigate('/dashboard')}
              className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
              Start Free <ArrowRight size={15} />
            </button>
            <a href="mailto:sales@driverguard.ai"
              className="px-6 py-3 rounded-xl border border-border bg-card text-on-surface font-semibold text-sm hover:border-primary/50 transition-colors">
              Talk to Sales
            </a>
          </div>
        </section>
      </main>
    </div>
  )
})

export default EnterprisePage
