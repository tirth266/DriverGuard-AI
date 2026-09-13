import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import SectionTitle from '../shared/SectionTitle'

const FAQ_ITEMS = [
  {
    question: 'How does DriverGuard AI work?',
    answer:
      'DriverGuard AI connects to an in-cabin optical sensor. It continuously monitors driver behavior in real time, detecting unsafe actions like fatigue, phone usage, smoking, and distracted driving using YOLO11 Object Detection. When a risk is detected, the system sends an instant voice alert to the driver and synchronizes telemetry with the fleet manager.',
  },
  {
    question: 'Does DriverGuard AI use Object Detection or Classification?',
    answer:
      'DriverGuard AI operates a legitimate YOLO11 Object Detection pipeline. Rather than guessing an entire image category, it detects distinct physical objects inside the cabin — such as mobile phones, seatbelts, and driver posture — returning exact normalized spatial bounding boxes and confidences.',
  },
  {
    question: 'Does the system work in zero-light night driving?',
    answer:
      'Yes. DriverGuard AI is designed to operate 24/7 across all lighting conditions, including total darkness. The optical pipeline is calibrated for infrared night-vision illumination without driver disturbance.',
  },
  {
    question: 'Can it scale across multiple vehicles and fleet sizes?',
    answer:
      'Absolutely. DriverGuard AI is architected for fleets of all scales — from single commercial owner-operators to enterprise fleets with thousands of vehicles. The cloud dashboard displays unified safety scores, active vehicles, and live camera telemetry.',
  },
  {
    question: 'How is driver data and privacy protected?',
    answer:
      'Privacy and security are fundamental. Telemetry is processed with end-to-end encryption. Sensitive frame logs are only stored when safety threshold violations occur, maintaining driver dignity while satisfying insurance compliance.',
  },
  {
    question: 'How long does hardware deployment take?',
    answer:
      'Hardware deployment is straightforward and non-invasive. Standard cabin setup typically takes under 25 minutes per vehicle, with automatic pairing to the DriverGuard AI cloud platform.',
  },
]

function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: typeof FAQ_ITEMS[0]
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-border/80 bg-card rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary/40">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none cursor-pointer group"
        aria-expanded={isOpen}
      >
        <span className="text-on-surface font-bold text-base md:text-lg pr-4 group-hover:text-primary transition-colors duration-200">
          {item.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex-shrink-0 w-8 h-8 rounded-xl bg-surface flex items-center justify-center border border-border group-hover:border-primary/40 text-on-surface-variant group-hover:text-primary transition-all duration-200"
        >
          <Plus size={18} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-1 text-on-surface-variant text-sm md:text-base leading-relaxed border-t border-border/50">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const FAQ = memo(function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section
      className="px-4 md:px-16 max-w-[1000px] mx-auto py-24 md:py-32"
      aria-label="Frequently Asked Questions"
      id="faq"
    >
      <SectionTitle
        badge="FAQ"
        title="Frequently Asked Questions"
        subtitle="Common questions about DriverGuard AI implementation, detection architecture, and fleet safety."
        centered
        className="mb-14"
      />

      <div className="space-y-4">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem
            key={i}
            item={item}
            isOpen={openIndex === i}
            onToggle={() => handleToggle(i)}
          />
        ))}
      </div>
    </section>
  )
})

export default FAQ
