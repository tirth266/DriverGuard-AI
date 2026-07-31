import { memo } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import SectionTitle from '../Shared/SectionTitle'
import Button from '../Shared/Button'
import GlassCard from '../Shared/GlassCard'

const PLANS = [
  {
    name: 'Starter',
    description: 'For small fleets getting started with driver safety.',
    price: '$29',
    period: '/vehicle/mo',
    features: [
      'Up to 25 vehicles',
      'Fatigue & phone detection',
      'Real-time voice alerts',
      'Basic dashboard',
      'Email notifications',
      'Standard support',
    ],
    cta: 'Contact Sales',
    variant: 'secondary' as const,
    highlight: false,
  },
  {
    name: 'Professional',
    description: 'For growing fleets that need advanced monitoring.',
    price: '$49',
    period: '/vehicle/mo',
    features: [
      'Up to 200 vehicles',
      'All detection features',
      'Real-time voice alerts',
      'Advanced dashboard & analytics',
      'Instant push notifications',
      'Incident reports',
      'API access',
      'Priority support',
    ],
    cta: 'Book Demo',
    variant: 'primary' as const,
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with custom requirements.',
    price: 'Custom',
    period: '',
    features: [
      'Unlimited vehicles',
      'All detection features',
      'Custom alert rules',
      'White-label dashboard',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'On-site installation',
      '24/7 premium support',
    ],
    cta: 'Contact Sales',
    variant: 'secondary' as const,
    highlight: false,
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.12, ease: 'easeOut' },
  }),
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
          <motion.div
            key={plan.name}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
          >
            <GlassCard
              className={`rounded-2xl p-8 flex flex-col gap-6 relative h-full ${
                plan.highlight
                  ? 'pricing-highlight ring-2 ring-blue-600'
                  : 'glass-card border border-border'
              }`}
            >
              {/* Badge */}
              {plan.highlight && 'badge' in plan && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold tracking-[0.08em] uppercase shadow-md">
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
              <a href="#contact">
                <Button
                  variant={plan.variant}
                  size="lg"
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </a>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  )
})

export default Pricing
