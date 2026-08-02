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
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[0.96] active:translate-y-0'

  const variantStyles = {
    primary:
      'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-primary/25 hover:shadow-md border border-transparent',
    secondary:
      'bg-surface text-on-surface hover:bg-card border border-border shadow-xs hover:shadow-md',
    glass:
      'glass-card text-on-surface hover:border-primary/40 border border-border shadow-xs hover:shadow-md',
    ghost:
      'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface hover:scale-[1.02] hover:translate-y-0',
    outline:
      'bg-transparent text-primary hover:bg-primary/10 border border-primary hover:shadow-sm',
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
