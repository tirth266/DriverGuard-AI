import { memo } from 'react'
import { motion } from 'framer-motion'
import Badge from '../Shared/Badge'
import SectionTitle from '../Shared/SectionTitle'
import type { BadgeVariant } from '../../types'

const CATEGORIES = [
  {
    id: 'safe-driving',
    label: 'Safe Driving',
    confidence: 99,
    badgeVariant: 'safe' as BadgeVariant,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuACw9JhUL8nL0cbWa3m-PYJegKxxO3yUOphvUmn_HizeT_quB4cGnaE7eY0XIPd2dRc9w46jDAEzW5rtgaN1VHoYtowmPITfz8WU79X2MPQTT35E3-1n3DFVkap2i4VhnuqLYE7slgchRY-rHy-HHNWOmw-dqiiIcpWw5g1iOaMCvTkghRmRlUhPgphhQRScmT_1IImgMijPbL6ScfaR7eYLSAobu3Xp7bFzqxKDrjYqvFj0N0o1Jpy6K4kplv2nHkZx6ExWbjOJ8w',
    imageAlt: 'A focused driver looking straight ahead at the road, AI monitoring with infrared effect',
  },
  {
    id: 'phone-use',
    label: 'Phone Use',
    confidence: 98,
    badgeVariant: 'danger' as BadgeVariant,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCAnYhDnR3vNAevtlwzOCuzCwmf5HXtNX7IbMbg6dVKKhYr7QLgVo-JlkgOLevY-7S29VGppqORDNj-Fn48HkYVfLa6k8l4mUGBV3bPYrXGP4oYrVAAD1QHWateVMehSlBoTsjYF38ytUUpb_z_lxceSxIS2-wam_fK0aqslVtMe_Cdes7LqX2Ms98rCsNX_YDAhAjHQ_ZhL0n1np25C5qewBJiq4Z66Y6KIGhy3ZzXfU_J1PTBTP4KkE0xG_p5KSZg3yXPLnLZRgE',
    imageAlt: 'A driver holding a smartphone while driving, infrared AI bounding boxes',
  },
  {
    id: 'drowsiness',
    label: 'Drowsiness',
    confidence: 96,
    badgeVariant: 'warning' as BadgeVariant,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuClCXmSyoo_Rf9JIb15DhlKQZMoALVAJAt9nKLVEXq8QzdFnRUAanRviB7FM_D4RQ7ykPQV_1QbvdEV645NRmy6fUp_kO6jwAmiLiszE0_Ub53IpVvoOrqGK1RUq7dze0Uoc7yq347bW2wNc0lnyjT1CvvSGoO8dEU0KcZUBxcu-pejscDgqolXsPUbcnMXdc22wYOEmcmMUfJbQbtia2A41SfzV3rLLy-cPwRX9_wdZdKFbIY9xsooetcZUEza8Hjr-aUi-ErlteY',
    imageAlt: 'A driver yawning with eyes partially closed, AI facial landmark detection',
  },
  {
    id: 'drinking',
    label: 'Drinking',
    confidence: 97,
    badgeVariant: 'danger' as BadgeVariant,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDIuqMV6THEzwRHuyjBIA1ZI5WerZ1p2OE2ANCY9DIHVuCfOyBoWwK1ljVY8OcUMY87DOuPIRt20Vows2Hi0WqLEi_HLEtCucSvNX5Ooiyr6CxTTIl71sUMxbo-xlYrBWrhA-SDFrbcwnrlvOGaXPtqyPai60x3cB6sR1h4zHkv4HhF5IHCCUTlHGRMYEBZPkBPn90CSMALMQRii-faqSDdbNXUXFu0U7JdpPzhJnHnkAv7j8WwneVbJU_hjYHMoHUT8GAwIJPoEMI',
    imageAlt: 'A driver drinking from a cup while looking away from the road, infrared AI analysis',
  },
  {
    id: 'makeup',
    label: 'Makeup',
    confidence: 94,
    badgeVariant: 'danger' as BadgeVariant,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCNw3tPo9Vyy8VChoOs6xeUv0qqMuCtz3elOy9yKJfeKZk-IJu-6OK7dygoBxZRT8ura7w4ivIgkruaMFcaEFoq0TQy6qdQKoBxfbMvIg20CqUOe8PGqraOvSolaJaN8CvcElzYfHI0S3PXR9tGG9y8zATiwq1ZA0EYWylBwr0DOePGq4a4DyyU9sxNFXkAiJokooGmjl4Xjpky4Rx_aOy3seyZZL0nH8VpYSH7Fj2vxc-hlfA6ma68Hz3yPT4Cg3e44_Gh5V3e8PA',
    imageAlt: 'A driver applying makeup while the vehicle is in motion, AI facial tracking',
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' },
  }),
}

const DetectionGrid = memo(function DetectionGrid() {
  return (
    <section
      className="px-4 md:px-16 max-w-[1440px] mx-auto py-[120px] bg-surface-container-lowest/50 rounded-[40px]"
      aria-label="Detection categories"
    >
      <SectionTitle
        title="Precision Event Mapping"
        subtitle="Our model is trained to recognize a wide spectrum of behaviors with high granular detail."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
        {CATEGORIES.map((cat, i) => (
          <motion.div
            key={cat.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            className="group relative overflow-hidden rounded-xl border border-white/5 cursor-pointer"
            role="article"
            aria-label={`${cat.label} detection — ${cat.confidence}% confidence`}
          >
            {/* Background image */}
            <div
              className="aspect-square bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{ backgroundImage: `url('${cat.imageUrl}')` }}
              role="img"
              aria-label={cat.imageAlt}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

            {/* Bottom label */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant tracking-[0.05em] uppercase text-[10px]">
                  CLASS
                </p>
                <h4 className="text-[20px] leading-[1.3] font-medium text-on-surface">
                  {cat.label}
                </h4>
              </div>
              <Badge variant={cat.badgeVariant}>
                {cat.confidence}% CONF.
              </Badge>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
})

export default DetectionGrid
