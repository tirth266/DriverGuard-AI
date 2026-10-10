import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import SectionTitle from '../shared/SectionTitle'

const FAQ_ITEMS = [
  {
    question: 'How does DriverGuard AI work?',
    answer:
      'DriverGuard AI runs on a camera feed in your browser. It detects phones, drinks and food in the cabin with YOLO11, and reads eye state, mouth opening and head pose with MediaPipe face landmarks. A confirmed phone detection or a sustained eye closure becomes an event recorded against the current ride, and ending the ride produces a report from those events.',
  },
  {
    question: 'Does DriverGuard AI use Object Detection or Classification?',
    answer:
      'Object detection. YOLO11 returns a bounding box and confidence for each detected object rather than one label for the whole frame. The classes it monitors are the ones the loaded model contains: the driver, cell phones, drinks and food. It does not detect seatbelts, driver posture or passengers.',
  },
  {
    question: 'What does it not detect?',
    answer:
      'Seatbelt compliance, driver posture, passengers, smoking, speeding and eye-gaze direction are not measured by the current pipeline. The monitoring screen labels the signals it cannot produce as NOT SUPPORTED rather than showing a placeholder reading.',
  },
  {
    question: 'Can it scale across multiple vehicles and fleet sizes?',
    answer:
      'A fleet account manages any number of driver and vehicle records. Live monitoring analyses one cabin at a time, in the browser of the person driving, and each session is recorded as a ride on that account. There is no multi-vehicle live view.',
  },
  {
    question: 'How is driver data and privacy protected?',
    answer:
      'Frames are analysed for the ride being monitored and are not stored. What persists is the ride record: its score, grade, and the events with their timestamps and durations. No video is written to disk or kept after the session.',
  },
  {
    question: 'How is it deployed?',
    answer:
      'There is no hardware to install on the driver\'s side. It is a web application: camera frames are captured in the browser and sent to your own backend, which runs YOLO11 and MediaPipe locally on its own CPU. No frame is sent to a third-party service, and the camera needs the user\'s permission.',
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
