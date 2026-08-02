import React, { useState, useEffect } from 'react'
import { cn, formatTimestamp, getSeverityColor, getAlertIcon } from '@/utils/helpers'
import { Alert, AlertSeverity } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'

interface AlertsPanelProps {
  alerts: Alert[]
  onAcknowledge: (id: number) => void
  onClearAll: () => void
  maxVisible?: number
  showSeverityFilter?: boolean
}

export const AlertsPanel = ({ 
  alerts, 
  onAcknowledge, 
  onClearAll, 
  maxVisible = 10,
  showSeverityFilter = true 
}: AlertsPanelProps) => {
  const [filter, setFilter] = useState<AlertSeverity | 'all'>('all')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.severity === filter)

  const visibleAlerts = filteredAlerts.slice(0, maxVisible)

  const severityCounts = {
    all: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  }

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getSeverityConfig = (severity: AlertSeverity) => {
    const configs = {
      critical: { color: 'danger', bg: 'bg-danger-500/10 border-danger-500/30', icon: '🚨' },
      warning: { color: 'warning', bg: 'bg-warning-500/10 border-warning-500/30', icon: '⚠️' },
      info: { color: 'info', bg: 'bg-blue-500/10 border-blue-500/30', icon: 'ℹ️' },
    }
    return configs[severity]
  }

  if (alerts.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-dark-100">Alerts</h3>
            <p className="text-sm text-dark-400">No active alerts</p>
          </div>
          <StatusBadge status="online" size="md" />
        </div>
        <div className="flex-1 flex items-center justify-center text-dark-500">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-lg font-medium">All Clear</p>
            <p className="text-sm mt-1">No safety alerts at this time</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-dark-100">Alerts</h3>
          <p className="text-sm text-dark-400">{alerts.length} total • {severityCounts.critical} critical</p>
        </div>
        <div className="flex items-center gap-2">
          {showSeverityFilter && (
            <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
              {(['all', 'critical', 'warning', 'info'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => setFilter(sev)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    filter === sev 
                      ? sev === 'all' 
                        ? 'bg-dark-700 text-dark-100' 
                        : `bg-${getSeverityConfig(sev as AlertSeverity).color}-500/20 text-${getSeverityConfig(sev as AlertSeverity).color}-400`
                      : 'text-dark-400 hover:text-dark-200'
                  )}
                >
                  {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-dark-700">
                    {severityCounts[sev]}
                  </span>
                </button>
              ))}
            </div>
          )}
          {alerts.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {visibleAlerts.map(alert => {
          const config = getSeverityConfig(alert.severity)
          const isExpanded = expandedIds.has(alert.id!)
          
          return (
            <div
              key={alert.id}
              className={cn(
                'group relative rounded-lg border p-3 transition-all duration-200',
                config.bg,
                'hover:border-opacity-50'
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5 flex-shrink-0">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge variant={config.color as any} size="sm">
                        {alert.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant={config.color as any} size="sm">
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-dark-400 font-mono">
                        {formatTimestamp(alert.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(alert.id!)}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isExpanded ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </IconButton>
                      {alert.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAcknowledge(alert.id!)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-dark-300">{alert.message}</p>
                  {alert.confidence && (
                    <p className="mt-1 text-xs text-dark-500">Confidence: {(alert.confidence * 100).toFixed(0)}%</p>
                  )}
                  
                  {isExpanded && alert.metadata && (
                    <div className="mt-3 pt-3 border-t border-current/20">
                      <p className="text-xs text-dark-500 font-mono">
                        {JSON.stringify(alert.metadata, null, 2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        
        {filteredAlerts.length > maxVisible && (
          <div className="text-center py-4 text-dark-500">
            <p className="text-sm">Showing {maxVisible} of {filteredAlerts.length} alerts</p>
          </div>
        )}
      </div>
    </Card>
  )
}

interface AlertBannerProps {
  alerts: Alert[]
  onDismiss: (id: number) => void
  maxVisible?: number
}

export const AlertBanner = ({ alerts, onDismiss, maxVisible = 3 }: AlertBannerProps) => {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').slice(0, maxVisible)
  const warningAlerts = alerts.filter(a => a.severity === 'warning').slice(0, maxVisible)
  const allAlerts = [...criticalAlerts, ...warningAlerts]

  if (allAlerts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {allAlerts.map(alert => {
        const config = getSeverityConfig(alert.severity)
        return (
          <div
            key={alert.id}
            className={cn(
              'animate-in flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg',
              config.bg,
              'w-full'
            )}
            role="alert"
          >
            <span className="text-xl mt-0.5 flex-shrink-0">{config.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={config.color as any} size="sm">
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-dark-400 font-mono">
                    {formatTimestamp(alert.timestamp)}
                  </span>
                </div>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => alert.id && onDismiss(alert.id)}
                  aria-label="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </IconButton>
              </div>
              <p className="mt-1 text-sm font-medium text-dark-100">{alert.message}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}