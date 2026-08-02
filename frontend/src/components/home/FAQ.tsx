import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'
import SectionTitle from '../shared/SectionTitle'
import GlassCard from '../shared/Card'

const FAQ_ITEMS = [
  {
    question: 'How does DriverGuard AI work?',
    answer: 'DriverGuard AI uses an intelligent camera system installed inside the vehicle cabin. It continuously monitors driver behavior in real time, detecting unsafe actions like fatigue, phone usage, smoking, and distracted driving. When a risk is detected, the system sends an instant voice alert to the driver and notifies the fleet manager.',
  },
  {
    question: 'Does it work at night?',
    answer: 'Yes, DriverGuard AI is designed to work 24/7 in all lighting conditions, including complete darkness. The system uses infrared technology to monitor drivers effectively regardless of ambient light levels.',
  },
  {
    question: 'Can it monitor multiple vehicles?',
    answer: 'Absolutely. DriverGuard AI is built for fleets of any size — from a handful of vehicles to thousands. The centralized dashboard lets fleet managers monitor all vehicles simultaneously with real-time status updates and alerts.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Security is a top priority. All data is encrypted in transit and at rest using industry-standard encryption protocols. We comply with GDPR and other major data protection regulations, and your data is never shared with third parties.',
  },
  {
    question: 'How long does installation take?',
    answer: 'Installation is quick and non-intrusive. A typical vehicle can be equipped in under 30 minutes. Our team provides full support during deployment, including on-site assistance for larger fleet rollouts.',
  },
]

function AccordionItem({ item, isOpen, onToggle }: {
  item: typeof FAQ_ITEMS[0]
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 px-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded group"
        aria-expanded={isOpen}
      >
        <span className="text-on-surface font-semibold text-[17px] leading-[1.4] pr-4 group-hover:text-primary transition-colors duration-200">
          {item.question}
        </span>
        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-border group-hover:border-primary/40 group-hover:scale-105 transition-all duration-200">
          {isOpen ? (
            <Minus size={16} className="text-primary" />
          ) : (
            <Plus size={16} className="text-on-surface-variant" />
          )}
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="text-on-surface-variant text-body-md leading-[1.7] pb-5 px-1 pr-12">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const FAQ = memo(function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section
      className="bg-surface border-y border-border py-[100px] transition-colors duration-300"
      aria-label="Frequently asked questions"
    >
      <div className="px-4 md:px-16 max-w-[1440px] mx-auto">
        <SectionTitle
          badge="FAQ"
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about DriverGuard AI."
        />

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <GlassCard className="max-w-3xl mx-auto rounded-2xl p-6 md:p-10 border border-border shadow-xl">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem
                key={item.question}
                item={item}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </GlassCard>
        </motion.div>
      </div>
    </section>
  )
})

export default FAQ
