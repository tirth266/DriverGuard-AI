import type { ReactNode } from 'react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import CustomCursor from '../components/motion/CustomCursor'
import PageLoader from '../components/motion/PageLoader'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface transition-colors duration-300 relative selection:bg-primary/30 selection:text-white">
      {/* Editorial Cursor and Snappy Page Loader */}
      <CustomCursor />
      <PageLoader />

      <Navbar />
      <main className="flex-1 pt-20" role="main">
        {children}
      </main>
      <Footer />
    </div>
  )
}
