import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Shield, GitBranch, Users } from 'lucide-react'

const FOOTER_COLS = [
  {
    title: 'Platform',
    links: [
      { label: 'Vision Core', href: '#' },
      { label: 'Safety API', href: '#' },
      { label: 'Research Engine', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'API Documentation', href: '#' },
      { label: 'Compliance Hub', href: '#' },
      { label: 'Open Dataset', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Contact Support', href: '#' },
    ],
  },
]

const Footer = memo(function Footer() {
  return (
    <footer
      className="bg-surface-container-lowest py-[120px] border-t border-outline-variant/20"
      role="contentinfo"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-4 md:px-16 max-w-[1440px] mx-auto">
        {/* Brand column */}
        <div className="space-y-4">
          <Link
            to="/"
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            aria-label="DriverGuard AI Home"
          >
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Shield className="text-primary" size={18} aria-hidden="true" />
            </div>
            <span className="font-display text-[24px] font-medium text-on-surface">
              DriverGuard AI
            </span>
          </Link>
          <p className="text-on-surface-variant text-body-md leading-[1.6]">
            Precision Safety Systems for the Autonomous Era.
          </p>
          {/* Social links */}
          <div className="flex gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-on-surface-variant hover:text-secondary transition-colors"
              aria-label="GitHub repository"
            >
              <GitBranch size={20} aria-hidden="true" />
            </a>
            <a
              href="#"
              className="text-on-surface-variant hover:text-secondary transition-colors"
              aria-label="Community"
            >
              <Users size={20} aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Link columns */}
        {FOOTER_COLS.map((col) => (
          <div key={col.title}>
            <h4 className="font-label-caps text-label-caps text-on-surface mb-6 tracking-[0.05em] uppercase">
              {col.title}
            </h4>
            <ul className="space-y-4" role="list">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-on-surface-variant hover:text-secondary transition-colors text-body-md leading-[1.6]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Copyright */}
      <div className="px-4 md:px-16 max-w-[1440px] mx-auto mt-20 pt-8 border-t border-white/5">
        <p className="text-on-surface-variant text-body-md text-center leading-[1.6]">
          © 2024 DriverGuard AI. Precision Safety Systems.
        </p>
      </div>
    </footer>
  )
})

export default Footer
