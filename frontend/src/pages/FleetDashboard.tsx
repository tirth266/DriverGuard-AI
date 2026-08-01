import { memo } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../layouts/DashboardLayout'
import BusinessDashboard from '../components/dashboard/BusinessDashboard'

const FleetDashboardPage = memo(function FleetDashboardPage() {
  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <BusinessDashboard />
      </motion.div>
    </DashboardLayout>
  )
})

export default FleetDashboardPage
