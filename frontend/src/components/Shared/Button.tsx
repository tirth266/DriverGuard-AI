import { memo, ReactNode, ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import type { ButtonVariant } from '../../types'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold shadow-md hover:shadow-lg hover:shadow-blue-500/25 focus:ring-2 focus:ring-blue-500/50 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
  glass:
    'bg-card text-on-surface border border-border hover:border-primary/50 focus:ring-2 focus:ring-primary/40 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed shadow-sm',
  outline:
    'bg-card border border-[#2563EB] text-[#2563EB] dark:text-blue-400 hover:bg-[#2563EB]/10 focus:ring-2 focus:ring-blue-500/40 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed font-semibold',
  secondary:
    'bg-card border border-[#2563EB] text-[#2563EB] dark:text-blue-400 hover:bg-[#2563EB]/10 focus:ring-2 focus:ring-blue-500/40 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed font-semibold',
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-4 py-2 text-[11px]',
  md: 'px-6 py-3 text-[12px]',
  lg: 'px-8 py-4 text-[13px]',
}

const Button = memo(function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: variant === 'primary' ? 0.98 : 1.01, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`font-label-caps tracking-[0.05em] uppercase rounded-lg transition-all duration-300 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  )
})

export default Button
