import { memo } from 'react'
import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'
import SectionTitle from '../Shared/SectionTitle'
import GlassCard from '../Shared/GlassCard'

const TESTIMONIALS = [
  {
    quote: 'DriverGuard AI helped us reduce risky driving incidents by over 40% and improved overall fleet safety across all our routes.',
    name: 'Michael Chen',
    role: 'Fleet Manager',
    company: 'TransGlobal Logistics',
    stars: 5,
  },
  {
    quote: 'The real-time alerts have transformed our driver monitoring process. We can now respond to safety events before they become accidents.',
    name: 'Sarah Williams',
    role: 'Operations Director',
    company: 'Metro Transit Corp',
    stars: 5,
  },
  {
    quote: 'Our accident rate dropped significantly after implementing DriverGuard AI. The ROI was clear within the first quarter.',
    name: 'James Rodriguez',
    role: 'CEO',
    company: 'SafeRide Transport',
    stars: 5,
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12, ease: 'easeOut' },
  }),
}

const Testimonials = memo(function Testimonials() {
  return (
    <section
      className="bg-surface border-y border-border py-[100px] transition-colors duration-300"
      aria-label="Customer testimonials"
    >
      <div className="px-4 md:px-16 max-w-[1440px] mx-auto">
        <SectionTitle
          badge="Testimonials"
          title="What Our Customers Say"
          subtitle="Fleet operators around the world trust DriverGuard AI to keep their drivers safe."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial, i) => (
            <motion.div
              key={testimonial.name}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
            >
              <GlassCard className="glass-card-hover rounded-2xl p-8 flex flex-col gap-5 border border-border relative h-full cursor-default">
                {/* Quote icon */}
                <Quote size={32} className="text-primary/20 absolute top-6 right-6" aria-hidden="true" />

                {/* Stars */}
                <div className="flex gap-1" aria-label={`${testimonial.stars} out of 5 stars`}>
                  {Array.from({ length: testimonial.stars }).map((_, j) => (
                    <Star key={j} size={16} className="text-amber-500 fill-amber-500" aria-hidden="true" />
                  ))}
                </div>

                {/* Quote text */}
                <p className="text-on-surface text-body-md leading-[1.7] flex-1 font-normal">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  {/* Avatar placeholder */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-[14px]">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="text-on-surface font-semibold text-[14px]">{testimonial.name}</p>
                    <p className="text-on-surface-variant text-[12px]">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
})

export default Testimonials
