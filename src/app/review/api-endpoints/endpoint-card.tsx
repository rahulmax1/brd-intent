'use client'

import { useState } from 'react'
import type { ApiEndpoint } from '@/lib/api-endpoints-data'
import { Check } from 'lucide-react'

const methodColors = {
  GET: 'bg-emerald-500',
  POST: 'bg-blue-500',
  PATCH: 'bg-amber-500',
  DELETE: 'bg-red-500',
}

export function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const [copied, setCopied] = useState(false)

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(endpoint.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="rounded-lg border px-5 py-4 transition-all hover:shadow-sm"
      style={{
        background: '#F8F8F7',
        borderColor: 'var(--border-default)',
      }}
    >
      {/* Header: Method + Path + Reference ID */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span
            className={`${methodColors[endpoint.method]} text-white text-[11px] font-bold px-2 py-1 rounded shrink-0`}
          >
            {endpoint.method}
          </span>
          <code
            className="text-[14px] font-mono break-all"
            style={{ color: 'var(--text-primary)' }}
          >
            {endpoint.path}
          </code>
        </div>
        <button
          onClick={handleCopyId}
          className="shrink-0 text-[12px] font-mono px-2 py-1 rounded hover:bg-slate-100 transition-colors relative"
          style={{ color: 'var(--text-muted)' }}
          title="Click to copy"
        >
          {endpoint.id}
          {copied && (
            <span className="absolute -top-6 right-0 text-[11px] bg-slate-800 text-white px-2 py-1 rounded whitespace-nowrap">
              <Check size={12} className="inline mr-1" />
              Copied
            </span>
          )}
        </button>
      </div>

      {/* Description */}
      <p
        className="text-[14px] leading-6 mb-3"
        style={{ color: 'var(--text-secondary)' }}
      >
        {endpoint.description}
      </p>

      {/* UUID Notice */}
      {endpoint.usesUuid && (
        <div className="mb-3 text-[13px] rounded bg-blue-50/60 border border-blue-200 px-3 py-2">
          <span style={{ color: 'var(--text-secondary)' }}>
            <strong>UUID parameter:</strong> <code className="text-xs font-mono">:id</code> uses UUID format —
            e.g., <code className="text-xs font-mono">550e8400-e29b-41d4-a716-446655440000</code>
          </span>
        </div>
      )}

      {/* Parameters */}
      {endpoint.parameters.length > 0 && (
        <div className="mb-3">
          <p className="text-[13px] font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            Parameters:
          </p>
          <ul className="space-y-1.5">
            {endpoint.parameters.map(param => (
              <li
                key={param.name}
                className="text-[13px] leading-5"
                style={{ color: 'var(--text-secondary)' }}
              >
                • <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{param.name}</code>
                {' '}
                <span className="text-[11px] text-slate-500">({param.location})</span>
                {': '}
                <span className="font-medium">{param.type}</span>
                {param.required && <span className="text-red-500 ml-1">*</span>}
                {' — '}
                {param.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Auth & Response */}
      <div className="flex gap-6 text-[13px]" style={{ color: 'var(--text-muted)' }}>
        <span>
          <strong>Auth:</strong> {endpoint.auth.join(', ')}
        </span>
        {endpoint.tables && (
          <span>
            <strong>Tables:</strong> {endpoint.tables.join(', ')}
          </span>
        )}
      </div>

      <p className="mt-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
        <strong>Response:</strong> {endpoint.response}
      </p>

      {endpoint.phaseDeferred && (
        <div className="mt-3 text-[12px] rounded bg-slate-100 px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
          ⏸️ <strong>Phase 1 Deferred</strong> — will be implemented in fast follow
        </div>
      )}
    </div>
  )
}
