import { memo } from 'react'
import { motion } from 'framer-motion'
import { Truck, Bus, Car, Building2, Package, Siren } from 'lucide-react'
import { use3DTilt } from '../../hooks/use3DTilt'

const TRUST_ITEMS = [
  { label: 'Logistics', icon: Truck },
  { label: 'School Transport', icon: Bus },
  { label: 'Taxi Services', icon: Car },
  { label: 'Corporate Fleet', icon: Building2 },
  { label: 'Delivery Companies', icon: Package },
  { label: 'Emergency Services', icon: Siren },
]

function TrustItemCard({ item, index }: { item: typeof TRUST_ITEMS[0]; index: number }) {
  const Icon = item.icon
  const tilt = use3DTilt({ maxRotation: 6, scale: 1.03 })

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
    >
      <div
        ref={tilt.ref}
        style={tilt.style}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
      >
        <div className="flex flex-col items-center gap-3 py-4 px-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-300 group cursor-pointer">
          <Icon size={24} className="text-on-surface-variant group-hover:text-primary group-hover:scale-110 transition-all duration-300" aria-hidden="true" />
          <span className="text-[12px] text-on-surface-variant group-hover:text-on-surface font-medium tracking-wide text-center transition-colors">
            {item.label}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

const TrustBanner = memo(function TrustBanner() {
  return (
    <section
      className="bg-surface border-y border-border py-14 transition-colors duration-300"
      aria-label="Trusted by fleet operators"
    >
      <div className="px-4 md:px-16 max-w-[1440px] mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center text-on-surface-variant text-label-caps font-label-caps tracking-[0.1em] uppercase mb-8 font-semibold"
        >
          Trusted by Fleet Operators Worldwide
        </motion.p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
          {TRUST_ITEMS.map((item, i) => (
            <TrustItemCard key={item.label} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
})

export default TrustBanner
