import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Mail,
  Lock,
  User,
  Building,
  ArrowRight,
  Eye,
  EyeOff,
  X,
  Send,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/shared/Button'
import ThemeToggle from '../components/layout/ThemeToggle'

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

  const { login, signup, loginWithGoogle, handleGoogleCallback, forgotPassword, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Redirect target after auth
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  // Handle Google OAuth callback on mount
  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')
    
    if (token) {
      // Clean URL - remove token from address bar
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, document.title, cleanUrl)
      
      // Process the token
      handleGoogleCallback(token, true).then(success => {
        if (success) {
          navigate(from, { replace: true })
        }
      })
    } else if (error) {
      // Clean URL
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, document.title, cleanUrl)
      
      // Show error
      const decodedError = decodeURIComponent(error)
      setErrors({ google: decodedError })
    }
  }, [searchParams, handleGoogleCallback, navigate, from])

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
    <div className="w-screen h-screen max-h-screen overflow-y-auto bg-gradient-to-b from-background via-surface/40 to-background text-on-surface flex flex-col justify-between transition-colors duration-300 relative">
      
      {/* Background Subtle Radial Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      {/* Top Header */}
      <header className="w-full px-6 md:px-12 py-5 flex items-center justify-between z-20">
        <Link
          to="/"
          className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded group"
        >
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-105 transition-transform">
            <Shield className="text-primary" size={22} />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight text-on-surface">
            DriverGuard <span className="text-primary font-normal">AI</span>
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Centered Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md bg-card/90 backdrop-blur-xl border border-border rounded-3xl p-6 sm:p-10 shadow-2xl relative transition-all duration-300"
        >
          <AnimatePresence mode="wait">
            {mode === 'signin' ? (
              <motion.div
                key="signin"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22 }}
                className="space-y-6"
              >
                {/* Header Title */}
                <div className="text-center space-y-1.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                    Welcome Back
                  </h1>
                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                    Sign in to manage your AI fleet safety account.
                  </p>
                </div>

                {/* Google Auth Button */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 active:scale-[0.99] font-medium text-sm py-3 px-4 rounded-xl shadow-xs hover:shadow-md transition-all duration-200"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
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
                    <span>Continue with Google</span>
                  </button>
                  {errors.google && (
                    <p className="text-xs text-rose-500 text-center" role="alert">{errors.google}</p>
                  )}
                </div>

                {/* OR Divider */}
                <div className="relative flex items-center justify-center my-4">
                  <div className="w-full border-t border-border" />
                  <span className="absolute bg-card px-3 text-[11px] text-on-surface-variant font-bold tracking-wider uppercase">
                    OR
                  </span>
                </div>

                {/* Form */}
                <form onSubmit={handleSignInSubmit} className="space-y-4">
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
              <motion.div
                key="signup"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22 }}
                className="space-y-5"
              >
                {/* Header Title */}
                <div className="text-center space-y-1.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                    Create Account
                  </h1>
                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                    Start protecting your fleet with AI today.
                  </p>
                </div>

{/* Google Auth Button */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 active:scale-[0.99] font-medium text-sm py-2.5 px-4 rounded-xl shadow-xs hover:shadow-md transition-all duration-200"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
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
                    <span>Continue with Google</span>
                  </button>
                  {errors.google && (
                    <p className="text-xs text-rose-500 text-center" role="alert">{errors.google}</p>
                  )}
                </div>

                {/* OR Divider */}
                <div className="relative flex items-center justify-center my-3">
                  <div className="w-full border-t border-border" />
                  <span className="absolute bg-card px-3 text-[11px] text-on-surface-variant font-bold tracking-wider uppercase">
                    OR
                  </span>
                </div>

                {/* Form */}
                <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
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
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-on-surface-variant border-t border-border/50 z-20">
        © {new Date().getFullYear()} DriverGuard AI. All rights reserved. Encrypted 256-bit Enterprise Protection.
      </footer>

      {/* FORGOT PASSWORD MODAL */}
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
              className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
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
