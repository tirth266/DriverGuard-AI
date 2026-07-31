import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Mail,
  Lock,
  User,
  Building,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  X,
  Send,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/Shared/Button'
import ThemeToggle from '../../components/Shared/ThemeToggle'

const DASHBOARD_PREVIEW_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCcKaLxmdIZwnR0lQmtyJqnulBLej0a0G8kFHVn1alPzu5Bih45tWBAph9k-Y_O-mDBiS96RZ6X6Pm6niij5B-CplXhXHUVFwTuaIm9ON1SnuBg7edeuTBmwyT-UrudvWqkJQYfwkRmLV4JkTFdmL0Za-_fIa5CC0_p2urfVKpFZ5yHicpcA_Xzpw1Baf5ENstaxctcRb9e5Ob1HFkQ9ZCUPonuqkQZT2f-2yawldUCYahojUrdLzzydNygLW_VYW37cVHmdtONPi4'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Sign In Form state
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
    rememberMe: true,
  })

  // Sign Up Form state
  const [signUpData, setSignUpData] = useState({
    name: '',
    company: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  })

  // Forgot password email state
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { login, signup, loginWithGoogle, forgotPassword, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect target after auth
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  // Validate Sign In
  const validateSignIn = () => {
    const newErrors: Record<string, string> = {}
    if (!signInData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!/\S+@\S+\.\S+/.test(signInData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!signInData.password) {
      newErrors.password = 'Password is required'
    } else if (signInData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Validate Sign Up
  const validateSignUp = () => {
    const newErrors: Record<string, string> = {}
    if (!signUpData.name.trim()) {
      newErrors.name = 'Full name is required'
    }

    if (!signUpData.company.trim()) {
      newErrors.company = 'Company name is required'
    }

    if (!signUpData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!/\S+@\S+\.\S+/.test(signUpData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!signUpData.password) {
      newErrors.password = 'Password is required'
    } else if (signUpData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!signUpData.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the Terms & Privacy Policy'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle Sign In Submit
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateSignIn()) return

    const success = await login(signInData.email, signInData.password, signInData.rememberMe)
    if (success) {
      navigate(from, { replace: true })
    }
  }

  // Handle Sign Up Submit
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateSignUp()) return

    const success = await signup(
      signUpData.name,
      signUpData.company,
      signUpData.email,
      signUpData.password
    )
    if (success) {
      navigate('/dashboard', { replace: true })
    }
  }

  // Handle Google Login
  const handleGoogleAuth = async () => {
    const success = await loginWithGoogle()
    if (success) {
      navigate(from, { replace: true })
    }
  }

  // Handle Forgot Password Submit
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim() || !/\S+@\S+\.\S+/.test(forgotEmail)) {
      setErrors({ forgotEmail: 'Please enter a valid email address' })
      return
    }
    setForgotLoading(true)
    await forgotPassword(forgotEmail)
    setForgotLoading(false)
    setShowForgotPassword(false)
    setForgotEmail('')
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col justify-between transition-colors duration-300 relative overflow-hidden">
      {/* Top Header */}
      <header className="w-full px-6 md:px-12 py-5 flex items-center justify-between z-20">
        <Link
          to="/"
          className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Shield className="text-primary" size={22} />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight text-on-surface">
            DriverGuard <span className="text-primary font-normal">AI</span>
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 md:px-10 lg:px-16 py-6 z-10 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* LEFT SIDE — Large Branding & Preview Illustration (7 cols on Desktop) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="lg:col-span-6 xl:col-span-7 space-y-8 pr-0 lg:pr-6"
          >
            {/* Live Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-dot block" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Enterprise AI Fleet Safety Platform
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-3xl md:text-5xl font-extrabold leading-[1.15] text-on-surface tracking-tight">
              Protect Every Journey <br />
              <span className="text-gradient-primary">with Intelligent Driver Monitoring</span>
            </h1>

            <p className="text-body-lg text-on-surface-variant max-w-xl leading-relaxed text-base md:text-lg">
              Trusted by fleet operators worldwide. Real-time driver drowsiness detection, distraction alerts,
              and predictive safety intelligence.
            </p>

            {/* Dashboard Preview Graphic */}
            <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-xl group">
              <img
                src={DASHBOARD_PREVIEW_IMG}
                alt="DriverGuard AI Fleet Safety Monitoring System Preview"
                className="w-full aspect-[16/9] object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.02]"
              />

              {/* HUD Badge 1 */}
              <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border flex items-center gap-2 shadow-md">
                <ShieldCheck className="text-emerald-500" size={18} />
                <div>
                  <span className="block text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                    Safety Score
                  </span>
                  <span className="block text-sm font-extrabold text-on-surface font-mono">98 / 100</span>
                </div>
              </div>

              {/* HUD Badge 2 */}
              <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border flex items-center gap-2.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
                <span className="text-xs font-bold text-on-surface font-mono">AI MONITORING ACTIVE</span>
              </div>
            </div>
          </motion.div>

          {/* RIGHT SIDE — Authentication Card (5 cols on Desktop) */}
          <div className="lg:col-span-6 xl:col-span-5 flex justify-center w-full">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md relative transition-all duration-300">
              <AnimatePresence mode="wait">
                {/* ── SIGN IN FORM ── */}
                {mode === 'signin' ? (
                  <motion.div
                    key="signin"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="space-y-1">
                      <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Welcome Back</h2>
                      <p className="text-sm text-on-surface-variant">Sign in to continue to your dashboard.</p>
                    </div>

                    {/* Google OAuth Button */}
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 active:scale-[0.99] font-medium text-sm py-3 px-4 rounded-xl shadow-sm transition-all duration-200"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      Continue with Google
                    </button>

                    {/* Divider */}
                    <div className="relative flex items-center justify-center my-4">
                      <div className="w-full border-t border-border" />
                      <span className="absolute bg-card px-3 text-xs text-on-surface-variant font-semibold tracking-wider uppercase">
                        OR
                      </span>
                    </div>

                    <form onSubmit={handleSignInSubmit} className="space-y-4">
                      {/* Email Input */}
                      <div>
                        <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail
                            size={18}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
                          />
                          <input
                            type="email"
                            placeholder="name@company.com"
                            value={signInData.email}
                            onChange={(e) => {
                              setSignInData({ ...signInData, email: e.target.value })
                              if (errors.email) setErrors({ ...errors, email: '' })
                            }}
                            className={`w-full bg-surface border ${
                              errors.email ? 'border-rose-500' : 'border-border'
                            } text-on-surface rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                          />
                        </div>
                        {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
                      </div>

                      {/* Password Input */}
                      <div>
                        <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                          Password
                        </label>
                        <div className="relative">
                          <Lock
                            size={18}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
                          />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={signInData.password}
                            onChange={(e) => {
                              setSignInData({ ...signInData, password: e.target.value })
                              if (errors.password) setErrors({ ...errors, password: '' })
                            }}
                            className={`w-full bg-surface border ${
                              errors.password ? 'border-rose-500' : 'border-border'
                            } text-on-surface rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password}</p>}
                      </div>

                      {/* Remember & Forgot */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer text-on-surface-variant hover:text-on-surface">
                          <input
                            type="checkbox"
                            checked={signInData.rememberMe}
                            onChange={(e) => setSignInData({ ...signInData, rememberMe: e.target.checked })}
                            className="rounded border-border text-primary focus:ring-primary/40 h-4 w-4"
                          />
                          <span>Remember me</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-primary hover:underline font-semibold"
                        >
                          Forgot Password?
                        </button>
                      </div>

                      {/* Sign In Button */}
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full mt-2"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2 justify-center">
                            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            Signing In…
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            Sign In <ArrowRight size={16} />
                          </span>
                        )}
                      </Button>
                    </form>

                    {/* Bottom Link */}
                    <div className="text-center pt-2 border-t border-border/60">
                      <p className="text-xs text-on-surface-variant">
                        Don't have an account?{' '}
                        <button
                          onClick={() => {
                            setMode('signup')
                            setErrors({})
                          }}
                          className="text-primary font-bold hover:underline"
                        >
                          Create Account
                        </button>
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  /* ── SIGN UP FORM ── */
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <div className="space-y-1">
                      <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Create Account</h2>
                      <p className="text-sm text-on-surface-variant">Start protecting your fleet today.</p>
                    </div>

                    {/* Google Button */}
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 active:scale-[0.99] font-medium text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all duration-200"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      Continue with Google
                    </button>

                    <div className="relative flex items-center justify-center my-3">
                      <div className="w-full border-t border-border" />
                      <span className="absolute bg-card px-3 text-[11px] text-on-surface-variant font-semibold tracking-wider uppercase">
                        OR
                      </span>
                    </div>

                    <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
                      {/* Name & Company grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-on-surface uppercase tracking-wider mb-1">
                            Full Name
                          </label>
                          <div className="relative">
                            <User
                              size={16}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                            />
                            <input
                              type="text"
                              placeholder="Alex Morgan"
                              value={signUpData.name}
                              onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                              className={`w-full bg-surface border ${
                                errors.name ? 'border-rose-500' : 'border-border'
                              } text-on-surface rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                            />
                          </div>
                          {errors.name && <p className="text-[10px] text-rose-500 mt-0.5">{errors.name}</p>}
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-on-surface uppercase tracking-wider mb-1">
                            Company
                          </label>
                          <div className="relative">
                            <Building
                              size={16}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                            />
                            <input
                              type="text"
                              placeholder="Apex Logistics"
                              value={signUpData.company}
                              onChange={(e) => setSignUpData({ ...signUpData, company: e.target.value })}
                              className={`w-full bg-surface border ${
                                errors.company ? 'border-rose-500' : 'border-border'
                              } text-on-surface rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                            />
                          </div>
                          {errors.company && <p className="text-[10px] text-rose-500 mt-0.5">{errors.company}</p>}
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-[11px] font-semibold text-on-surface uppercase tracking-wider mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                          />
                          <input
                            type="email"
                            placeholder="alex@apexlogistics.com"
                            value={signUpData.email}
                            onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                            className={`w-full bg-surface border ${
                              errors.email ? 'border-rose-500' : 'border-border'
                            } text-on-surface rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                          />
                        </div>
                        {errors.email && <p className="text-[10px] text-rose-500 mt-0.5">{errors.email}</p>}
                      </div>

                      {/* Password & Confirm */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-on-surface uppercase tracking-wider mb-1">
                            Password
                          </label>
                          <div className="relative">
                            <Lock
                              size={16}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                            />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Min 8 chars"
                              value={signUpData.password}
                              onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                              className={`w-full bg-surface border ${
                                errors.password ? 'border-rose-500' : 'border-border'
                              } text-on-surface rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                            >
                              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          {errors.password && <p className="text-[10px] text-rose-500 mt-0.5">{errors.password}</p>}
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-on-surface uppercase tracking-wider mb-1">
                            Confirm Password
                          </label>
                          <div className="relative">
                            <Lock
                              size={16}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                            />
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="Confirm password"
                              value={signUpData.confirmPassword}
                              onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                              className={`w-full bg-surface border ${
                                errors.confirmPassword ? 'border-rose-500' : 'border-border'
                              } text-on-surface rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                            >
                              {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          {errors.confirmPassword && (
                            <p className="text-[10px] text-rose-500 mt-0.5">{errors.confirmPassword}</p>
                          )}
                        </div>
                      </div>

                      {/* Terms checkbox */}
                      <div>
                        <label className="flex items-start gap-2 cursor-pointer text-[11px] text-on-surface-variant leading-tight">
                          <input
                            type="checkbox"
                            checked={signUpData.agreeTerms}
                            onChange={(e) => setSignUpData({ ...signUpData, agreeTerms: e.target.checked })}
                            className="rounded border-border text-primary focus:ring-primary/40 h-3.5 w-3.5 mt-0.5"
                          />
                          <span>
                            I agree to the{' '}
                            <a href="#terms" className="text-primary hover:underline font-semibold">
                              Terms of Service
                            </a>{' '}
                            and{' '}
                            <a href="#privacy" className="text-primary hover:underline font-semibold">
                              Privacy Policy
                            </a>
                          </span>
                        </label>
                        {errors.agreeTerms && <p className="text-[10px] text-rose-500 mt-0.5">{errors.agreeTerms}</p>}
                      </div>

                      {/* Submit */}
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full mt-1"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2 justify-center">
                            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            Creating Account…
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            Create Account <Sparkles size={16} />
                          </span>
                        )}
                      </Button>
                    </form>

                    {/* Bottom link */}
                    <div className="text-center pt-2 border-t border-border/60">
                      <p className="text-xs text-on-surface-variant">
                        Already have an account?{' '}
                        <button
                          onClick={() => {
                            setMode('signin')
                            setErrors({})
                          }}
                          className="text-primary font-bold hover:underline"
                        >
                          Sign In
                        </button>
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-on-surface-variant border-t border-border/50">
        © {new Date().getFullYear()} DriverGuard AI. All rights reserved. Encrypted 256-bit Enterprise Protection.
      </footer>

      {/* ── FORGOT PASSWORD MODAL ── */}
      <AnimatePresence>
        {showForgotPassword && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotPassword(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Send className="text-primary" size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-on-surface">Reset Password</h3>
                    <p className="text-xs text-on-surface-variant">We'll send you instructions via email.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg hover:bg-surface transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                    Account Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
                    />
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-surface border border-border text-on-surface rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                  </div>
                  {errors.forgotEmail && (
                    <p className="text-xs text-rose-500 mt-1">{errors.forgotEmail}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="glass"
                    size="md"
                    className="flex-1"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="flex-1"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? 'Sending…' : 'Send Reset Link'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
