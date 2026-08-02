import { memo } from 'react'
import { motion } from 'framer-motion'
import Dashboard from '../components/dashboard/Dashboard'

const pageVariants = {
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 },
} as const

const DashboardPage = memo(function DashboardPage() {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.35 }}
      className="w-full h-full flex-1 flex flex-col overflow-hidden"
    >
      <Dashboard />
    </motion.div>
  )
})

export default DashboardPage
