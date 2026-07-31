import { memo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Shield } from 'lucide-react'
import Button from '../components/shared/Button'

const NotFound = memo(function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6"
      role="main"
      aria-label="Page not found"
    >
      <div className="flex items-center justify-center mb-8">
        <div className="h-20 w-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Shield className="text-primary" size={36} aria-hidden="true" />
        </div>
      </div>

      <h1 className="font-display text-[96px] leading-none font-bold text-primary/20 mb-2">
        404
      </h1>
      <h2 className="font-display text-display text-on-surface mb-4">
        Page Not Found
      </h2>
      <p className="text-on-surface-variant text-body-lg max-w-md mb-10">
        The route you're looking for doesn't exist. Navigate back to the DriverGuard AI platform.
      </p>

      <Link to="/">
        <Button variant="primary" size="lg" className="flex items-center gap-2">
          <Home size={16} />
          Back to Home
        </Button>
      </Link>
    </motion.div>
  )
})

export default NotFound
