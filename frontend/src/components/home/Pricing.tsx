import { memo } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import SectionTitle from '../shared/SectionTitle'
import Button from '../shared/Button'
import GlassCard from '../shared/Card'
import { use3DTilt } from '../../hooks/use3DTilt'

/**
 * What the software does, not a commercial offer.
 *
 * These were priced tiers with per-vehicle limits, SLAs, API access, push
 * notifications, white-labeling and on-site installation. None of that exists:
 * there is no billing system, no per-vehicle quota, no public API, and no push
 * notification channel. Presenting them as purchasable plans describes a
 * product that has not been built, so the tiers below describe capability
 * instead and say plainly that nothing is for sale yet.
 */
const PLANS = [
  {
    name: 'Personal',
    description: 'One driver, one ride at a time, scored end to end.',
    price: 'Free',
    period: '',
    features: [
      'Single-ride live monitoring',
      'Phone, drinking & eating detection',
      'Drowsiness, yawning & head-pose detection',
      'Ride score, grade and event timeline',
      'PDF ride report',
    ],
    cta: 'Get Started',
    variant: 'secondary' as const,
    highlight: false,
  },
  {
    name: 'Fleet',
    description: 'Drivers and vehicles, with rides attributed to both.',
    price: 'Free',
    period: '',
    features: [
      'Everything in Personal',
      'Driver and vehicle records',
      'Ride history per driver and vehicle',
      'Ride reports as PDF',
      'Email invitations to your own drivers',
    ],
    cta: 'Set Up Fleet',
    variant: 'primary' as const,
    highlight: true,
    badge: 'Available now',
  },
  {
    name: 'Not yet built',
    description: 'Capabilities this product does not have yet.',
    price: '',
    period: '',
    features: [
      'Billing or subscriptions',
      'Public API or webhooks',
      'SSO / SAML sign-in',
      'Push or SMS notifications',
      'Multi-vehicle live view',
    ],
    cta: '',
    variant: 'secondary' as const,
    highlight: false,
  },
]

function PricingCard({ plan, index }: { plan: typeof PLANS[0]; index: number }) {
  const tilt = use3DTilt({ maxRotation: 5, scale: 1.02 })

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: index * 0.1, ease: 'easeOut' }}
    >
      <div
        ref={tilt.ref}
        style={tilt.style}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
        className="h-full"
      >
        <GlassCard
          className={`rounded-2xl p-8 flex flex-col gap-6 relative h-full transition-shadow hover:shadow-2xl ${
            plan.highlight
              ? 'pricing-highlight ring-2 ring-primary shadow-xl shadow-primary/10'
              : 'glass-card border border-border'
          }`}
        >
          {/* Badge */}
          {plan.highlight && 'badge' in plan && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 rounded-full bg-primary text-white text-[11px] font-bold tracking-[0.08em] uppercase shadow-md">
                {plan.badge}
              </span>
            </div>
          )}

          {/* Header */}
          <div>
            <h3 className="text-headline-md font-bold text-on-surface mb-1">
              {plan.name}
            </h3>
            <p className="text-on-surface-variant text-[14px] leading-[1.5]">
              {plan.description}
            </p>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="font-metric text-[48px] leading-none font-extrabold text-on-surface tracking-[-0.02em]">
              {plan.price}
            </span>
            {plan.period && (
              <span className="text-on-surface-variant text-[14px]">{plan.period}</span>
            )}
          </div>

          {/* Features */}
          <ul className="space-y-3 flex-1" role="list">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <Check size={18} className="text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-on-surface-variant text-[14px] leading-[1.5]">
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          {/* CTA. The third card has none: it lists what is missing, so there is
              nothing to sign up for. */}
          {plan.cta && (
            <a href="#contact">
              <Button
                variant={plan.variant}
                size="lg"
                className="w-full"
              >
                {plan.cta}
              </Button>
            </a>
          )}
        </GlassCard>
      </div>
    </motion.div>
  )
}

const Pricing = memo(function Pricing() {
  return (
    <section
      className="px-4 md:px-16 max-w-[1440px] mx-auto py-[100px] bg-background"
      aria-label="Pricing plans"
      id="pricing"
    >
      <SectionTitle
        badge="Pricing"
        title="Simple, Transparent Pricing"
        subtitle="Choose the plan that fits your fleet. Scale as you grow."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {PLANS.map((plan, i) => (
          <PricingCard key={plan.name} plan={plan} index={i} />
        ))}
      </div>
    </section>
  )
})

export default Pricing
