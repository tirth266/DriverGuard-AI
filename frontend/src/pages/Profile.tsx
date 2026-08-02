import { memo } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/shared/Button'

const ProfilePage = memo(function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="w-full h-full max-h-full overflow-y-auto p-4 md:p-8 max-w-[1000px] mx-auto text-on-surface transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        {/* Header Banner */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-md flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary text-white text-2xl font-bold flex items-center justify-center">
                {user?.name ? user.name[0] : 'U'}
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface">{user?.name}</h1>
              <p className="text-sm text-on-surface-variant">{user?.role || 'Driver'}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 size={12} /> Verified Account
                </span>
              </div>
            </div>
          </div>
          <Button variant="primary" size="md">
            Edit Profile
          </Button>
        </div>

        {/* User Details Form */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-md space-y-6">
          <h2 className="text-lg font-bold text-on-surface border-b border-border pb-4">
            Account Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                readOnly
                value={user?.name || ''}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-on-surface text-sm font-medium focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                readOnly
                value={user?.email || ''}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-on-surface text-sm font-medium focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Organization / Company
              </label>
              <input
                type="text"
                readOnly
                value={user?.company || 'Personal Driver'}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-on-surface text-sm font-medium focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Account Type
              </label>
              <input
                type="text"
                readOnly
                value={user?.role === 'business' ? 'Business Admin' : 'Personal Driver'}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-on-surface text-sm font-medium uppercase tracking-wider font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
})

export default ProfilePage
