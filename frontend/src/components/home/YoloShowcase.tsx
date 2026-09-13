import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { User, Smartphone, Shield, CheckCircle2, Activity, Cpu } from 'lucide-react'

interface DetectionItem {
  id: string
  label: string
  name: string
  confidence: number
  status: 'Normal' | 'Distraction' | 'Safe'
  isCritical: boolean
  coords: { x1: number; y1: number; x2: number; y2: number }
  style: { top: string; left: string; width: string; height: string }
  icon: typeof User
  semanticColor: string
  badgeColor: string
}

const DEMO_DETECTIONS: DetectionItem[] = [
  {
    id: 'person',
    label: 'PERSON',
    name: 'Driver Detection',
    confidence: 0.99,
    status: 'Normal',
    isCritical: false,
    coords: { x1: 194, y1: 15, x2: 632, y2: 440 },
    style: { top: '7%', left: '26%', width: '48%', height: '78%' },
    icon: User,
    semanticColor: 'text-safe border-safe',
    badgeColor: 'text-safe bg-safe/10 border-safe/30',
  },
  {
    id: 'phone',
    label: 'MOBILE PHONE',
    name: 'Mobile Phone Usage',
    confidence: 0.94,
    status: 'Distraction',
    isCritical: true,
    coords: { x1: 310, y1: 190, x2: 420, y2: 340 },
    style: { top: '38%', left: '44%', width: '18%', height: '32%' },
    icon: Smartphone,
    semanticColor: 'text-danger border-danger',
    badgeColor: 'text-danger bg-danger/10 border-danger/30',
  },
  {
    id: 'seatbelt',
    label: 'SEATBELT',
    name: 'Seatbelt Fastened',
    confidence: 0.91,
    status: 'Safe',
    isCritical: false,
    coords: { x1: 240, y1: 180, x2: 520, y2: 460 },
    style: { top: '34%', left: '32%', width: '36%', height: '56%' },
    icon: Shield,
    semanticColor: 'text-safe border-safe',
    badgeColor: 'text-safe bg-safe/10 border-safe/30',
  },
]

export default memo(function YoloShowcase() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(true)

  const activeDetections = showAll
    ? DEMO_DETECTIONS
    : DEMO_DETECTIONS.filter(d => d.id === selectedId)

  return (
    <section
      id="cv-showcase"
      className="py-20 md:py-28 px-6 max-w-[1280px] mx-auto"
      aria-label="Computer Vision Inspection Engine"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

        {/* ─── LEFT: Large Detection Visualization (7 Cols) ─── */}
        <div className="lg:col-span-7">
          <div className="rounded-[20px] overflow-hidden border border-white/10 bg-[#070707] shadow-2xl">
            
            {/* Top Telemetry Header */}
            <div className="px-5 py-3 border-b border-white/10 bg-surface/80 flex items-center justify-between text-xs font-mono text-text-secondary">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-safe" />
                <span className="font-semibold text-text-primary">YOLO11 SPATIAL INFERENCE</span>
              </div>
              <span className="text-text-muted">CAMERA_FEED_01 · LIVE</span>
            </div>

            {/* Visual Frame */}
            <div className="relative aspect-[16/10] bg-black overflow-hidden select-none">
              <img
                src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80"
                alt="Cabin computer vision detection view showing driver with bounding boxes"
                className="w-full h-full object-cover opacity-85"
              />

              {/* Laser Scan Line */}
              <motion.div
                className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand to-transparent pointer-events-none z-10 opacity-70"
                animate={{ top: ['4%', '94%', '4%'] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
              />

              {/* Bounding Box Overlays */}
              {activeDetections.map(det => {
                const isSelected = selectedId === det.id || selectedId === null
                const borderColor = det.isCritical ? 'border-danger' : 'border-safe'
                const textColor = det.isCritical ? 'text-danger' : 'text-safe'

                return (
                  <motion.div
                    key={det.id}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: isSelected ? 1 : 0.25,
                      scale: selectedId === det.id ? 1.01 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    style={det.style}
                    className="absolute z-20 pointer-events-none"
                  >
                    <div className={`w-full h-full border ${borderColor} relative bg-black/10`}>
                      {/* Corner Accents */}
                      <span className={`absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 ${borderColor}`} />
                      <span className={`absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 ${borderColor}`} />
                      <span className={`absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 ${borderColor}`} />
                      <span className={`absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 ${borderColor}`} />

                      {/* Header Badge */}
                      <div className={`absolute -top-5 left-0 bg-[#070707]/90 px-1.5 py-0.5 border ${borderColor} rounded-[3px] text-[9px] font-mono font-bold ${textColor} flex items-center gap-1`}>
                        <span>{det.label}</span>
                        <span className="text-white font-normal">{Math.round(det.confidence * 100)}%</span>
                      </div>

                      {/* Coordinates */}
                      <div className="absolute bottom-1 right-1 bg-[#070707]/80 px-1 py-0.2 rounded-[2px] text-[8px] font-mono text-white/70">
                        [{det.coords.x1},{det.coords.y1}]
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Technical Metadata Footer */}
            <div className="px-5 py-3 bg-surface border-t border-border flex items-center justify-between text-xs font-mono text-text-muted flex-wrap gap-3">
              <div className="flex items-center gap-5">
                <span>MODEL: <strong className="text-text-primary">YOLO11n</strong></span>
                <span>INFERENCE: <strong className="text-safe">24ms</strong></span>
                <span>PRECISION: <strong className="text-text-primary">FP16</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-text-secondary">
                <CheckCircle2 size={13} className="text-safe" />
                <span>Spatial Coordinates Verified</span>
              </div>
            </div>

          </div>
        </div>

        {/* ─── RIGHT: Inspection Console (5 Cols) ─── */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-[6px] border border-border bg-surface text-text-secondary">
              <Cpu size={12} className="text-brand" />
              <span className="font-mono text-[11px] font-semibold tracking-wider uppercase text-text-primary">
                Object Detection Engine
              </span>
            </div>

            <h2 className="font-display text-[32px] sm:text-[38px] leading-[1.12] font-extrabold tracking-[-0.03em] text-text-primary">
              See what the model sees.
            </h2>

            <p className="text-text-secondary text-sm leading-[1.65]">
              True multi-object detection identifies bounding boxes, facial gaze, and hand-held
              devices in parallel. Click any detected object below to isolate its bounding box.
            </p>
          </div>

          {/* Compact Detection Rows */}
          <div className="space-y-2.5">
            {DEMO_DETECTIONS.map(det => {
              const isSelected = selectedId === det.id
              const Icon = det.icon

              return (
                <div
                  key={det.id}
                  onClick={() => {
                    if (selectedId === det.id) {
                      setSelectedId(null)
                      setShowAll(true)
                    } else {
                      setSelectedId(det.id)
                      setShowAll(false)
                    }
                  }}
                  className={`p-3.5 rounded-[12px] border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-surface border-brand shadow-sm'
                      : 'bg-surface/60 hover:bg-surface border-border hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-[8px] border ${det.badgeColor}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-xs tracking-tight text-text-primary">
                            {det.name}
                          </h3>
                          <span className="text-[10px] font-mono text-text-muted">
                            [{det.coords.x1}, {det.coords.y1}, {det.coords.x2}, {det.coords.y2}]
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary mt-0.5">
                          Bounding box confidence {Math.round(det.confidence * 100)}%
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold tracking-wider uppercase border ${
                        det.isCritical
                          ? 'text-danger bg-danger/10 border-danger/30'
                          : 'text-safe bg-safe/10 border-safe/30'
                      }`}>
                        {det.status}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Reset selection */}
          {!showAll && (
            <button
              onClick={() => {
                setSelectedId(null)
                setShowAll(true)
              }}
              className="text-xs font-semibold text-brand hover:underline flex items-center gap-1.5 cursor-pointer pt-1"
            >
              <CheckCircle2 size={13} />
              <span>Show all bounding boxes</span>
            </button>
          )}

          {/* Engineering Credibility Note */}
          <div className="p-3.5 rounded-[12px] bg-surface/40 border border-border/80 text-xs text-text-secondary flex items-start gap-2.5">
            <Activity size={15} className="text-brand flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed text-[12px]">
              <strong className="text-text-primary">Direct Neural Inference:</strong> The YOLO11 architecture calculates normalized spatial coordinates directly on edge silicon, avoiding cloud streaming delay.
            </span>
          </div>

        </div>

      </div>
    </section>
  )
})
