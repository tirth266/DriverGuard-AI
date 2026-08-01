import React, { memo } from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}

const Button = memo(function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'

  const variantStyles = {
    primary:
      'bg-primary text-white hover:bg-primary-hover shadow-sm border border-transparent',
    secondary:
      'bg-surface text-on-surface hover:bg-card border border-border',
    glass:
      'glass-card text-on-surface hover:border-primary/40 border border-border shadow-xs',
    ghost:
      'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface',
    outline:
      'bg-transparent text-primary hover:bg-primary/10 border border-primary',
  }

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})

export default Button
