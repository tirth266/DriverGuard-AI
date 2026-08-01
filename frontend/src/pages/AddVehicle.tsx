import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Truck,
  Shield,
  User,
  FileCheck,
  CheckCircle2,
  X,
  RotateCcw,
  Save,
  ArrowLeft,
} from 'lucide-react'
import MainLayout from '../layouts/MainLayout'
import { useToast } from '../context/ToastContext'

interface VehicleFormState {
  // Vehicle Info
  vehicleNumber: string
  registrationNumber: string
  vehicleType: 'Truck' | 'Bus' | 'Taxi' | 'Car' | 'Van'

  // Vehicle Details
  manufacturer: string
  model: string
  year: string
  color: string
  vinNumber: string

  // Assignment
  assignedDriver: string
  department: string

  // Insurance
  insuranceCompany: string
  policyNumber: string
  insuranceExpiry: string

  // Status
  status: 'Active' | 'Maintenance' | 'Inactive'
}

const INITIAL_FORM: VehicleFormState = {
  vehicleNumber: 'FLEET-4082',
  registrationNumber: 'KA-01-MJ-9921',
  vehicleType: 'Truck',

  manufacturer: 'Freightliner',
  model: 'Cascadia 126',
  year: '2024',
  color: 'Midnight Blue',
  vinNumber: '1FUJGLDR8RHK18293',

  assignedDriver: 'John Driver',
  department: 'Logistics & Intermodal',

  insuranceCompany: 'HDFC ERGO Commercial Line',
  policyNumber: 'POL-992182-COMM',
  insuranceExpiry: '2026-12-31',

  status: 'Active',
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-on-surface text-xs font-medium ' +
  'placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/50 ' +
  'focus:border-primary transition-all'

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5'

const AddVehiclePage = memo(function AddVehiclePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState<VehicleFormState>(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (key: keyof VehicleFormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleReset = () => {
    setForm(INITIAL_FORM)
    toast.info('Form Reset', 'All vehicle parameters reset to defaults.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vehicleNumber || !form.registrationNumber || !form.vinNumber) {
      toast.error('Validation Error', 'Vehicle Number, Registration Number, and VIN Number are required.')
      return
    }
    setIsSubmitting(true)
    await new Promise(r => setTimeout(r, 700))
    setIsSubmitting(false)
    toast.success('Vehicle Saved Successfully', `Vehicle ${form.vehicleNumber} (${form.model}) registered.`)
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
                Add Fleet Vehicle
              </h1>
              <p className="text-xs md:text-sm text-on-surface-variant">
                Register a new vehicle in your fleet management inventory.
              </p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── SECTION 1: VEHICLE INFORMATION ─────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Truck size={18} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-on-surface">Vehicle Information</h2>
                <p className="text-xs text-on-surface-variant">Registration & vehicle type classification.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Vehicle Number *</label>
                <input
                  type="text"
                  required
                  placeholder="FLEET-4082"
                  value={form.vehicleNumber}
                  onChange={e => handleChange('vehicleNumber', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Registration Number *</label>
                <input
                  type="text"
                  required
                  placeholder="KA-01-MJ-9921"
                  value={form.registrationNumber}
                  onChange={e => handleChange('registrationNumber', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Vehicle Type</label>
                <select
                  value={form.vehicleType}
                  onChange={e => handleChange('vehicleType', e.target.value as any)}
                  className={inputClass + ' cursor-pointer'}
                >
                  <option value="Truck">Truck</option>
                  <option value="Bus">Bus</option>
                  <option value="Taxi">Taxi</option>
                  <option value="Car">Car</option>
                  <option value="Van">Van</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* ── SECTION 2: VEHICLE DETAILS ──────────────────── */}
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
                <h2 className="text-base font-extrabold text-on-surface">Vehicle Details</h2>
                <p className="text-xs text-on-surface-variant">Manufacturer, VIN, and specs.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Manufacturer</label>
                <input
                  type="text"
                  placeholder="Freightliner / Volvo / Kenworth"
                  value={form.manufacturer}
                  onChange={e => handleChange('manufacturer', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Model</label>
                <input
                  type="text"
                  placeholder="Cascadia 126"
                  value={form.model}
                  onChange={e => handleChange('model', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Year</label>
                <input
                  type="number"
                  placeholder="2024"
                  value={form.year}
                  onChange={e => handleChange('year', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Color</label>
                <input
                  type="text"
                  placeholder="Midnight Blue"
                  value={form.color}
                  onChange={e => handleChange('color', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>VIN Number *</label>
                <input
                  type="text"
                  required
                  placeholder="1FUJGLDR8RHK18293"
                  value={form.vinNumber}
                  onChange={e => handleChange('vinNumber', e.target.value)}
                  className={inputClass + ' font-mono'}
                />
              </div>
            </div>
          </motion.div>

          {/* ── SECTION 3: ASSIGNMENT ───────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <User size={18} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-on-surface">Assignment & Department</h2>
                <p className="text-xs text-on-surface-variant">Assign driver and operational unit.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Assign Driver</label>
                <select
                  value={form.assignedDriver}
                  onChange={e => handleChange('assignedDriver', e.target.value)}
                  className={inputClass + ' cursor-pointer'}
                >
                  <option value="John Driver">John Driver (DRV-101)</option>
                  <option value="Marcus Vance">Marcus Vance (DRV-102)</option>
                  <option value="Elena Rostova">Elena Rostova (DRV-103)</option>
                  <option value="David Miller">David Miller (DRV-104)</option>
                  <option value="Samantha Reed">Samantha Reed (DRV-105)</option>
                  <option value="Unassigned">Unassigned</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Department</label>
                <input
                  type="text"
                  placeholder="Logistics & Intermodal"
                  value={form.department}
                  onChange={e => handleChange('department', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </motion.div>

          {/* ── SECTION 4: INSURANCE ────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <FileCheck size={18} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-on-surface">Insurance Coverage</h2>
                <p className="text-xs text-on-surface-variant">Policy details & expiry tracking.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Insurance Company</label>
                <input
                  type="text"
                  placeholder="HDFC ERGO Commercial"
                  value={form.insuranceCompany}
                  onChange={e => handleChange('insuranceCompany', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Policy Number</label>
                <input
                  type="text"
                  placeholder="POL-992182-COMM"
                  value={form.policyNumber}
                  onChange={e => handleChange('policyNumber', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Expiry Date</label>
                <input
                  type="date"
                  value={form.insuranceExpiry}
                  onChange={e => handleChange('insuranceExpiry', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </motion.div>

          {/* ── SECTION 5: OPERATIONAL STATUS ───────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-on-surface">Operational Status</h2>
                <p className="text-xs text-on-surface-variant">Initial availability state in fleet.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(['Active', 'Maintenance', 'Inactive'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleChange('status', st)}
                  className={`py-3 rounded-2xl border text-xs font-bold transition-all ${
                    form.status === st
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface text-on-surface-variant border-border hover:border-primary/50'
                  }`}
                >
                  {st}
                </button>
              ))}
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
                  <><Save size={15} /> Save Vehicle</>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </MainLayout>
  )
})

export default AddVehiclePage
