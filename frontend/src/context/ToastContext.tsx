import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextType {
  toast: (type: ToastType, title: string, message?: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: ToastMessage = { id, type, title, message }

      setToasts((prev) => [...prev.slice(-4), newToast])

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        removeToast(id)
      }, 4000)
    },
    [removeToast]
  )

  const success = useCallback((title: string, message?: string) => toast('success', title, message), [toast])
  const error = useCallback((title: string, message?: string) => toast('error', title, message), [toast])
  const info = useCallback((title: string, message?: string) => toast('info', title, message), [toast])
  const warning = useCallback((title: string, message?: string) => toast('warning', title, message), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      {/* Toast Notification Layer */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-colors ${
                t.type === 'success'
                  ? 'bg-card border-emerald-500/30 text-on-surface'
                  : t.type === 'error'
                  ? 'bg-card border-rose-500/30 text-on-surface'
                  : t.type === 'warning'
                  ? 'bg-card border-amber-500/30 text-on-surface'
                  : 'bg-card border-primary/30 text-on-surface'
              }`}
            >
              {t.type === 'success' && <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />}
              {t.type === 'error' && <XCircle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />}
              {t.type === 'warning' && <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />}
              {t.type === 'info' && <Info size={20} className="text-primary flex-shrink-0 mt-0.5" />}

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-on-surface tracking-tight">{t.title}</h4>
                {t.message && <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">{t.message}</p>}
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg transition-colors"
                aria-label="Dismiss toast"
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
