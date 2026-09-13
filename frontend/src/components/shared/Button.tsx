import React, { memo } from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'ghost' | 'outline' | 'danger'
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
    'inline-flex items-center justify-center font-medium rounded-[10px] transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none active:translate-y-0'

  const variantStyles = {
    primary:
      'bg-primary text-white hover:bg-primary-hover shadow-xs border border-primary/20 hover:-translate-y-0.5 active:translate-y-0',
    secondary:
      'bg-surface text-on-surface hover:bg-surface-hover border border-border shadow-xs hover:-translate-y-0.5 active:translate-y-0',
    glass:
      'bg-surface/80 text-on-surface hover:bg-surface border border-border shadow-xs hover:-translate-y-0.5 active:translate-y-0',
    ghost:
      'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface/60',
    outline:
      'bg-transparent text-primary hover:bg-primary/10 border border-primary/40',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-xs border border-rose-500/20 hover:-translate-y-0.5 active:translate-y-0',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs tracking-tight',
    md: 'px-4 py-2 text-sm tracking-tight',
    lg: 'px-6 py-2.5 text-base tracking-tight font-semibold',
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
