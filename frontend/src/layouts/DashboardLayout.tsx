import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'
import ThemeToggle from '../components/Shared/ThemeToggle'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-on-surface transition-colors duration-300" role="main">
      {/* Minimal top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 glass-header border-b border-border transition-all duration-300">
        <Link
          to="/"
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded py-1 px-2"
          aria-label="Back to home"
        >
          <ArrowLeft size={16} />
          <span className="text-[12px] font-semibold tracking-wider uppercase">Back</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <Shield className="text-primary" size={16} />
          </div>
          <span className="text-[14px] font-display font-extrabold text-on-surface tracking-tight">
            DriverGuard <span className="text-primary font-normal">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      <div className="pt-14">
        {children}
      </div>
    </div>
  )
}

