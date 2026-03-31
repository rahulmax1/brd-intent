'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export function UuidAlert() {
  const [dismissed, setDismissed] = useState(false)

  // Check localStorage on mount
  useEffect(() => {
    const isDismissed = localStorage.getItem('api-endpoints-uuid-alert-dismissed')
    if (isDismissed === 'true') {
      setDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('api-endpoints-uuid-alert-dismissed', 'true')
  }

  if (dismissed) return null

  return (
    <div
      className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50/80 px-5 py-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            ⚠️ UUID Requirement — Schema Migration Needed
          </p>
          <p className="mt-1.5 text-[14px] leading-6" style={{ color: 'var(--text-secondary)' }}>
            Current schema uses sequential integer IDs (<code className="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs font-mono">int [pk, increment]</code>),
            but these endpoints require <strong>non-sequential UUIDs</strong> to prevent enumeration attacks.
            Schema must be migrated to <code className="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs font-mono">uuid</code> type before API implementation.
          </p>
          <p className="mt-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            See <code className="text-xs font-mono">docs/superpowers/specs/api-endpoints-validation.md</code> for migration details.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 hover:bg-amber-100/60 transition-colors"
          aria-label="Dismiss alert"
        >
          <X size={18} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
    </div>
  )
}
