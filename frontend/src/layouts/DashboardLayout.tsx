import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0B0F17]" role="main">
      {/* Minimal top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-[#0B0F17]/90 backdrop-blur-sm border-b border-white/5">
        <Link
          to="/"
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          aria-label="Back to home"
        >
          <ArrowLeft size={16} />
          <span className="text-[12px] font-medium tracking-widest uppercase">Back</span>
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="text-secondary" size={16} />
          <span className="text-[12px] font-bold text-white tracking-wider uppercase">
            Sentinel Drive AI
          </span>
        </div>
        <div className="w-16" /> {/* Spacer */}
      </header>
      <div className="pt-12">
        {children}
      </div>
    </div>
  )
}
