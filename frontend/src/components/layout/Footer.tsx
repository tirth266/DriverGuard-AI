import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'

const FOOTER_COLS = [
  {
    title: 'Platform',
    links: [
      { label: 'Computer Vision', href: '#cv-showcase' },
      { label: 'Live Monitoring', href: '#solutions' },
      { label: 'Fleet Telemetry', href: '#metrics' },
      { label: 'Capabilities', href: '#features' },
    ],
  },
  {
    title: 'Enterprise',
    links: [
      { label: 'Fleet Pricing', href: '#pricing' },
      { label: 'Industries Served', href: '#industries' },
      { label: 'Security & Compliance', href: '#about' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Status Console', href: '#' },
      { label: 'Contact Support', href: '#' },
    ],
  },
]

export default memo(function Footer() {
  return (
    <footer
      className="bg-[#070707] py-16 border-t border-border text-text-primary"
      role="contentinfo"
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-10 px-6 max-w-[1280px] mx-auto">
        
        {/* Brand column (2 cols) */}
        <div className="md:col-span-2 space-y-4">
          <Link
            to="/"
            className="flex items-center gap-2.5 focus:outline-none"
            aria-label="DriverGuard AI Home"
          >
            <div className="w-8 h-8 rounded-[8px] bg-brand/10 border border-brand/25 flex items-center justify-center">
              <Shield className="text-brand w-4 h-4" aria-hidden="true" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-text-primary">
              DriverGuard <span className="text-brand font-medium">AI</span>
            </span>
          </Link>

          <p className="text-text-secondary text-xs leading-[1.65] max-w-sm">
            AI-powered driver safety, distraction detection, fatigue monitoring,
            and commercial fleet safety intelligence.
          </p>

          <div className="flex items-center gap-2 pt-1 text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse" />
            <span className="font-mono text-[11px] text-text-secondary">
              All Systems Operational · Edge Inference Active
            </span>
          </div>
        </div>

        {/* Link columns (3 cols) */}
        {FOOTER_COLS.map((col) => (
          <div key={col.title}>
            <h4 className="font-mono text-[11px] text-text-muted mb-4 uppercase tracking-wider font-semibold">
              {col.title}
            </h4>
            <ul className="space-y-2.5" role="list">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-text-secondary hover:text-text-primary transition-colors text-xs"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* System Status and Metadata Bar */}
      <div className="px-6 max-w-[1280px] mx-auto mt-12 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-text-muted">
        <div>
          © {new Date().getFullYear()} DriverGuard AI Technologies Inc. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <span>MODEL: YOLO11-EDGE</span>
          <span>LATENCY: &lt;30MS</span>
          <span>VERSION: 2.4.0</span>
        </div>
      </div>
    </footer>
  )
})
