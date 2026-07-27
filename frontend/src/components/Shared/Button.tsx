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
    'bg-primary text-on-primary hover:opacity-90 focus:ring-2 focus:ring-primary/50 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
  glass:
    'glass-card text-on-surface hover:bg-white/5 focus:ring-2 focus:ring-white/20 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
  outline:
    'border border-outline-variant text-on-surface hover:bg-white/5 focus:ring-2 focus:ring-outline-variant/50 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-4 py-2 text-[11px]',
  md: 'px-6 py-3 text-label-caps',
  lg: 'px-8 py-4 text-label-caps',
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
      whileHover={disabled ? {} : { scale: variant === 'primary' ? 0.97 : 1.01 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`font-label-caps tracking-[0.05em] uppercase rounded transition-all duration-300 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  )
})

export default Button
