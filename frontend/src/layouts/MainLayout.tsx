import type { ReactNode } from 'react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col w-screen h-screen max-h-screen overflow-y-auto bg-background text-on-surface transition-colors duration-300">
      <Navbar />
      <main className="flex-1 pt-20" role="main">
        {children}
      </main>
      <Footer />
    </div>
  )
}
