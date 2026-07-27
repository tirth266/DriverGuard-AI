import { memo } from 'react'
import { motion } from 'framer-motion'
import Dashboard from '../../components/Dashboard/Dashboard'

const pageVariants = {
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 },
}

const DashboardPage = memo(function DashboardPage() {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.35 }}
    >
      <Dashboard />
    </motion.div>
  )
})

export default DashboardPage
