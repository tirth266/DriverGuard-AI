import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Globe, MessageCircle, Mail } from 'lucide-react'

const FOOTER_COLS = [
  {
    title: 'Solutions',
    links: [
      { label: 'Fleet Safety', href: '#solutions' },
      { label: 'Driver Monitoring', href: '#features' },
      { label: 'Real-Time Alerts', href: '#how-it-works' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '#about' },
      { label: 'Industries', href: '#industries' },
      { label: 'Careers', href: '#' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '#' },
      { label: 'Contact', href: '#contact' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
    ],
  },
]

const Footer = memo(function Footer() {
  return (
    <footer
      className="bg-background py-16 border-t border-border transition-colors duration-300"
      role="contentinfo"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10 px-4 md:px-16 max-w-[1440px] mx-auto">
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
            <span className="font-display text-[24px] font-bold text-on-surface">
              DriverGuard AI
            </span>
          </Link>
          <p className="text-on-surface-variant text-body-md leading-[1.6]">
            Intelligent Fleet Safety for Modern Enterprises.
          </p>
          {/* Social links */}
          <div className="flex gap-3">
            <a
              href="#"
              className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface"
              aria-label="Website"
            >
              <Globe size={18} aria-hidden="true" />
            </a>
            <a
              href="#"
              className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface"
              aria-label="Chat"
            >
              <MessageCircle size={18} aria-hidden="true" />
            </a>
            <a
              href="#"
              className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface"
              aria-label="Email"
            >
              <Mail size={18} aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Link columns */}
        {FOOTER_COLS.map((col) => (
          <div key={col.title}>
            <h4 className="font-label-caps text-label-caps text-on-surface mb-5 tracking-[0.05em] uppercase font-bold">
              {col.title}
            </h4>
            <ul className="space-y-3" role="list">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-on-surface-variant hover:text-primary transition-colors text-[14px] leading-[1.6]"
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
      <div className="px-4 md:px-16 max-w-[1440px] mx-auto mt-14 pt-8 border-t border-border">
        <p className="text-on-surface-variant text-[13px] text-center leading-[1.6]">
          © {new Date().getFullYear()} DriverGuard AI. All rights reserved. Intelligent Fleet Safety Platform.
        </p>
      </div>
    </footer>
  )
})

export default Footer
