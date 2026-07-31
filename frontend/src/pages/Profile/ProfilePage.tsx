import { memo } from 'react'
import { motion } from 'framer-motion'
import { User, Building, Mail, Shield, CheckCircle2, KeyRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import MainLayout from '../../layouts/MainLayout'
import Button from '../../components/Shared/Button'

const ProfilePage = memo(function ProfilePage() {
  const { user } = useAuth()

  return (
    <MainLayout>
      <div className="min-h-screen bg-background text-on-surface pt-24 pb-16 px-4 md:px-12 max-w-[1000px] mx-auto transition-colors duration-300">
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
                <p className="text-sm text-on-surface-variant">{user?.role || 'Fleet Operator'}</p>
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

          {/* Profile Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Details */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-on-surface border-b border-border pb-3 flex items-center gap-2">
                <User size={18} className="text-primary" /> Personal Information
              </h2>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs text-on-surface-variant uppercase font-semibold block">Full Name</label>
                  <p className="font-medium text-on-surface mt-0.5">{user?.name}</p>
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant uppercase font-semibold block">Email Address</label>
                  <p className="font-medium text-on-surface mt-0.5 flex items-center gap-2">
                    <Mail size={14} className="text-on-surface-variant" /> {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Organization Info */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-on-surface border-b border-border pb-3 flex items-center gap-2">
                <Building size={18} className="text-primary" /> Organization Details
              </h2>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs text-on-surface-variant uppercase font-semibold block">Company Name</label>
                  <p className="font-medium text-on-surface mt-0.5">{user?.company}</p>
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant uppercase font-semibold block">Security Level</label>
                  <p className="font-medium text-on-surface mt-0.5 flex items-center gap-2">
                    <Shield size={14} className="text-emerald-500" /> Enterprise 256-Bit Encrypted
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  )
})

export default ProfilePage
