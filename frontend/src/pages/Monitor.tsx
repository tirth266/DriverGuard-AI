import { memo } from 'react'
import { motion } from 'framer-motion'
import { Radio, Eye, ShieldAlert, Truck, Users } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'

const VEHICLE_FEEDS = [
  {
    id: 'FLEET-4082',
    driver: 'John Driver',
    status: 'ACTIVE',
    score: 98,
    drowsiness: '2%',
    speed: '62 mph',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'FLEET-3021',
    driver: 'Michael Smith',
    status: 'ACTIVE',
    score: 94,
    drowsiness: '5%',
    speed: '58 mph',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'FLEET-1094',
    driver: 'Elena Rostova',
    status: 'ALERT',
    score: 82,
    drowsiness: '18%',
    speed: '45 mph',
    image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'FLEET-5509',
    driver: 'David Kim',
    status: 'ACTIVE',
    score: 99,
    drowsiness: '1%',
    speed: '65 mph',
    image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80',
  },
]

const MonitorPage = memo(function MonitorPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-background text-on-surface pt-24 pb-16 px-4 md:px-12 max-w-[1440px] mx-auto transition-colors duration-300">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-2">
              <Radio size={12} className="animate-pulse" /> Live Fleet Control
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
              Live AI Monitoring Center
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Real-time computer vision monitoring across active operational fleet vehicles.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono bg-card px-4 py-2 rounded-xl border border-border">
            <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" /> 4 ACTIVE FEEDS
            </span>
            <span className="text-on-surface-variant">|</span>
            <span className="text-on-surface font-semibold">STREAM LATENCY: 42ms</span>
          </div>
        </div>

        {/* Video Feeds Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {VEHICLE_FEEDS.map((feed, idx) => (
            <motion.div
              key={feed.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg transition-colors"
            >
              {/* Top Bar */}
              <div className="px-4 py-3 bg-surface border-b border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-primary" />
                  <span className="font-bold font-mono text-on-surface">{feed.id}</span>
                  <span className="text-on-surface-variant">— {feed.driver}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                    feed.status === 'ALERT'
                      ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                  }`}
                >
                  {feed.status}
                </span>
              </div>

              {/* Feed Display */}
              <div className="relative aspect-video bg-black overflow-hidden group">
                <img
                  src={feed.image}
                  alt={feed.driver}
                  className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 border-2 border-emerald-500/40 pointer-events-none" />

                {/* Corner Overlay Ticks */}
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] text-white font-mono">
                  <Eye size={12} className="text-emerald-400" />
                  <span>AI TRACKING</span>
                </div>

                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] text-white font-mono">
                  SPEED: {feed.speed}
                </div>
              </div>

              {/* Metrics Footer */}
              <div className="p-4 grid grid-cols-2 gap-4 text-xs bg-surface border-t border-border">
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-semibold block">Safety Score</span>
                  <span className="font-mono font-bold text-on-surface text-base">{feed.score} / 100</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-semibold block">Drowsiness</span>
                  <span className="font-mono font-bold text-emerald-500 text-base">{feed.drowsiness}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </MainLayout>
  )
})

export default MonitorPage
