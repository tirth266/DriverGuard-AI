import { memo } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../layouts/DashboardLayout'
import LiveMonitoringCenter from '../components/dashboard/LiveMonitoringCenter'

const MonitorPage = memo(function MonitorPage() {
  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full flex-1 flex flex-col overflow-hidden"
      >
        <LiveMonitoringCenter />
      </motion.div>
    </DashboardLayout>
  )
})

export default MonitorPage
