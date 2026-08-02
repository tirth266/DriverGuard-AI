import React, { forwardRef } from 'react'
import { cn } from '@/utils/helpers'

interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ 
    className, 
    isOpen, 
    onClose, 
    title, 
    description, 
    size = 'md', 
    closeOnOverlayClick = true, 
    closeOnEscape = true,
    children, 
    ...props 
  }, ref) => {
    const sizeStyles = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-4xl',
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose()
      }
    }

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && closeOnOverlayClick) {
        onClose()
      }
    }

    if (!isOpen) return null

    return (
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
      >
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            ref={ref}
            className={cn(
              'w-full bg-dark-900 border border-dark-700 rounded-xl shadow-2xl animate-in',
              sizeStyles[size],
              className
            )}
            onKeyDown={handleKeyDown}
            {...props}
          >
            {(title || description) && (
              <div className="px-6 py-4 border-b border-dark-700">
                {title && (
                  <h2 id="modal-title" className="text-lg font-semibold text-dark-100">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="modal-description" className="mt-1 text-sm text-dark-400">
                    {description}
                  </p>
                )}
              </div>
            )}
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

Modal.displayName = 'Modal'

interface AlertDialogProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary' | 'warning'
  isLoading?: boolean
}

export const AlertDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  ...props
}: AlertDialogProps) => {
  const variantStyles = {
    danger: 'bg-danger-600 hover:bg-danger-700 focus:ring-danger-500',
    primary: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    warning: 'bg-warning-600 hover:bg-warning-700 focus:ring-warning-500',
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} size="sm" {...props}>
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-dark-300 bg-dark-800 border border-dark-600 rounded-lg hover:bg-dark-700 focus:outline-none focus:ring-2 focus:ring-dark-500 disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={cn(
            'px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-950',
            variantStyles[variant],
            isLoading && 'opacity-50 cursor-wait'
          )}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Confirming...
            </span>
          ) : (
            confirmText
          )}
        </button>
      </div>
    </Modal>
  )
}

interface ToastProps {
  id: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onClose: (id: string) => void
}

export const Toast = ({ id, message, type = 'info', duration = 5000, onClose }: ToastProps) => {
  const typeStyles = {
    success: 'bg-success-500/20 border-success-500/30 text-success-400',
    error: 'bg-danger-500/20 border-danger-500/30 text-danger-400',
    warning: 'bg-warning-500/20 border-warning-500/30 text-warning-400',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }

  React.useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 animate-in flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg',
        'min-w-[280px] max-w-md',
        typeStyles[type]
      )}
      role="alert"
    >
      <span className="flex-shrink-0 text-lg">{icons[type]}</span>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastProps[]
  onClose: (id: string) => void
}

export const ToastContainer = ({ toasts, onClose }: ToastContainerProps) => (
  <div className="pointer-events-none">
    {toasts.map(toast => (
      <Toast key={toast.id} {...toast} onClose={onClose} />
    ))}
  </div>
)