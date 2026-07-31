import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastMessage = { id, type, title, message }
    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      removeToast(id)
    }, 4500)
  }, [removeToast])

  const success = useCallback((title: string, message?: string) => showToast('success', title, message), [showToast])
  const error = useCallback((title: string, message?: string) => showToast('error', title, message), [showToast])
  const info = useCallback((title: string, message?: string) => showToast('info', title, message), [showToast])

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 md:px-0"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence mode="sync">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md transition-colors ${
                toast.type === 'success'
                  ? 'bg-card border-emerald-500/30 text-on-surface'
                  : toast.type === 'error'
                  ? 'bg-card border-rose-500/30 text-on-surface'
                  : 'bg-card border-primary/30 text-on-surface'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="text-emerald-500" size={20} />
                ) : toast.type === 'error' ? (
                  <AlertCircle className="text-rose-500" size={20} />
                ) : (
                  <Info className="text-primary" size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-on-surface tracking-tight">{toast.title}</h4>
                {toast.message && (
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-lg hover:bg-surface"
                aria-label="Close notification"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
