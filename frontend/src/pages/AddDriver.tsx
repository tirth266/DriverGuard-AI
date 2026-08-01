import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  User,
  Shield,
  Truck,
  PhoneCall,
  Camera,
  X,
  RotateCcw,
  Save,
  ArrowLeft,
  MailCheck,
} from 'lucide-react'
import MainLayout from '../layouts/MainLayout'
import { useToast } from '../context/ToastContext'

interface DriverFormState {
  // Driver Info
  photoUrl: string
  fullName: string
  email: string
  phone: string
  employeeId: string
  dob: string
  gender: string

  // Driving Info
  licenseNumber: string
  licenseExpiry: string
  experienceYears: string
  driverType: 'Personal' | 'Commercial'

  // Vehicle Assignment
  assignedVehicle: string
  vehicleNumber: string
  department: string

  // Emergency Contact
  emergencyName: string
  emergencyPhone: string
  emergencyRelationship: string
}

const INITIAL_FORM: DriverFormState = {
  photoUrl: '',
  fullName: '',
  email: '',
  phone: '',
  employeeId: '',
  dob: '',
  gender: 'Male',

  licenseNumber: '',
  licenseExpiry: '',
  experienceYears: '3',
  driverType: 'Commercial',

  assignedVehicle: 'Freightliner Cascadia',
  vehicleNumber: 'FLEET-4082',
  department: 'Logistics Operations',

  emergencyName: '',
  emergencyPhone: '',
  emergencyRelationship: 'Spouse',
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-on-surface text-xs font-medium ' +
  'placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/50 ' +
  'focus:border-primary transition-all'

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5'

const AddDriverPage = memo(function AddDriverPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState<DriverFormState>(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (key: keyof DriverFormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleReset = () => {
    setForm(INITIAL_FORM)
    toast.info('Form Reset', 'All input fields have been cleared.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.email || !form.licenseNumber) {
      toast.error('Validation Error', 'Please fill in Full Name, Email, and License Number.')
      return
    }
    setIsSubmitting(true)
    await new Promise(r => setTimeout(r, 700))
    setIsSubmitting(false)
    toast.success('Driver Added Successfully', `${form.fullName} profile created. Invitation email sent to ${form.email}.`)
    navigate('/fleet')
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background text-on-surface pt-24 pb-16 px-4 md:px-12 max-w-4xl mx-auto transition-colors duration-300">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/fleet')}
              className="p-2 rounded-xl border border-border bg-card hover:bg-surface text-on-surface-variant transition-colors"
              title="Back to Fleet"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
                Add New Driver
              </h1>
              <p className="text-xs md:text-sm text-on-surface-variant">
                Register a new driver profile in your fleet operations.
              </p>
            </div>
          </div>
        </div>

        {/* Invitation Flow Notice */}
        <div className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
          <MailCheck size={18} className="text-primary mt-0.5 flex-shrink-0" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-on-surface">Invitation-Based Account Onboarding</p>
            <p className="text-on-surface-variant leading-relaxed">
              DriverGuard AI uses secure email invitations. Once saved, an invitation link will be sent to the driver's email address so they can create their password or sign in with Google.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── SECTION 1: DRIVER INFORMATION ───────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <User size={18} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-on-surface">Driver Information</h2>
                <p className="text-xs text-on-surface-variant">Personal details and identification.</p>
              </div>
            </div>

            {/* Photo Upload Row */}
            <div className="flex items-center gap-5 p-4 rounded-2xl bg-surface border border-border">
              <div className="h-16 w-16 rounded-2xl bg-card border border-border flex items-center justify-center text-on-surface-variant relative overflow-hidden flex-shrink-0">
                {form.photoUrl ? (
                  <img src={form.photoUrl} alt="Driver" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={24} />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-on-surface">Driver Photo</p>
                <p className="text-[11px] text-on-surface-variant">PNG or JPG up to 5MB. Recommended square aspect ratio.</p>
                <button
                  type="button"
                  onClick={() => {
                    const mockUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
                    handleChange('photoUrl', mockUrl)
                    toast.success('Photo Uploaded', 'Sample photo attached.')
                  }}
                  className="text-xs text-primary font-semibold hover:underline inline-block pt-1"
                >
                  Upload Photo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Johnathan Driver"
                  value={form.fullName}
                  onChange={e => handleChange('fullName', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="john.driver@fleet.com"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 019-2834"
                  value={form.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Employee ID</label>
                <input
                  type="text"
                  placeholder="EMP-8092"
                  value={form.employeeId}
                  onChange={e => handleChange('employeeId', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Date of Birth</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={e => handleChange('dob', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Gender</label>
                <select
                  value={form.gender}
                  onChange={e => handleChange('gender', e.target.value)}
                  className={inputClass + ' cursor-pointer'}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* ── SECTION 2: DRIVING INFORMATION ─────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Shield size={18} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-on-surface">Driving Information</h2>
                <p className="text-xs text-on-surface-variant">License & experience credentials.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Driving License Number *</label>
                <input
                  type="text"
                  required
                  placeholder="DL-893019283-X"
                  value={form.licenseNumber}
                  onChange={e => handleChange('licenseNumber', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>License Expiry Date</label>
                <input
                  type="date"
                  value={form.licenseExpiry}
                  onChange={e => handleChange('licenseExpiry', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Years of Experience</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={form.experienceYears}
                  onChange={e => handleChange('experienceYears', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Driver Type</label>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  {(['Personal', 'Commercial'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleChange('driverType', type)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        form.driverType === type
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface text-on-surface-variant border-border hover:border-primary/50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── SECTION 3: VEHICLE ASSIGNMENT ────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Truck size={18} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-on-surface">Vehicle Assignment</h2>
                <p className="text-xs text-on-surface-variant">Assign primary vehicle and fleet department.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Assign Vehicle</label>
                <select
                  value={form.assignedVehicle}
                  onChange={e => handleChange('assignedVehicle', e.target.value)}
                  className={inputClass + ' cursor-pointer'}
                >
                  <option value="Freightliner Cascadia">Freightliner Cascadia</option>
                  <option value="Kenworth T680">Kenworth T680</option>
                  <option value="Volvo VNL 860">Volvo VNL 860</option>
                  <option value="Peterbilt 579">Peterbilt 579</option>
                  <option value="Mack Anthem">Mack Anthem</option>
                  <option value="Unassigned">Unassigned / Standby</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Vehicle Number</label>
                <input
                  type="text"
                  placeholder="FLEET-4082"
                  value={form.vehicleNumber}
                  onChange={e => handleChange('vehicleNumber', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Department</label>
                <input
                  type="text"
                  placeholder="Logistics Operations"
                  value={form.department}
                  onChange={e => handleChange('department', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </motion.div>

          {/* ── SECTION 4: EMERGENCY CONTACT ────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <PhoneCall size={18} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-on-surface">Emergency Contact</h2>
                <p className="text-xs text-on-surface-variant">Primary point of contact during road incidents.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mary Driver"
                  value={form.emergencyName}
                  onChange={e => handleChange('emergencyName', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Emergency Phone</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 998-1122"
                  value={form.emergencyPhone}
                  onChange={e => handleChange('emergencyPhone', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Relationship</label>
                <select
                  value={form.emergencyRelationship}
                  onChange={e => handleChange('emergencyRelationship', e.target.value)}
                  className={inputClass + ' cursor-pointer'}
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Manager">Fleet Manager</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* ── BUTTONS ────────────────────────────────────── */}
          <div className="flex items-center justify-between pt-4 flex-wrap gap-4">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-surface text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-2"
            >
              <RotateCcw size={14} /> Reset Form
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/fleet')}
                className="px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-surface text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1.5"
              >
                <X size={14} /> Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-md disabled:opacity-60"
              >
                {isSubmitting ? (
                  <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Saving...</>
                ) : (
                  <><Save size={15} /> Save Driver</>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </MainLayout>
  )
})

export default AddDriverPage
