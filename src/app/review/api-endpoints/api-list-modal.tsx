'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { endpointsByDomain } from '@/lib/api-endpoints-data'
import { formatEndpointsList } from '@/lib/format-endpoints-list'

interface ApiListModalProps {
  open: boolean
  onClose: () => void
}

export function ApiListModal({ open, onClose }: ApiListModalProps) {
  const [copied, setCopied] = useState(false)
  const copyButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const formattedList = useMemo(
    () => formatEndpointsList(endpointsByDomain),
    []
  )

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useEffect(() => {
    if (open && copyButtonRef.current) {
      copyButtonRef.current.focus()
    }
  }, [open])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedList)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return

    const copyButton = copyButtonRef.current
    const closeButton = closeButtonRef.current

    if (!copyButton || !closeButton) return

    if (e.shiftKey) {
      // Shift+Tab: if on copy button, move to close button
      if (document.activeElement === copyButton) {
        e.preventDefault()
        closeButton.focus()
      }
    } else {
      // Tab: if on close button, move to copy button
      if (document.activeElement === closeButton) {
        e.preventDefault()
        copyButton.focus()
      }
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col shadow-2xl"
        style={{
          width: 'min(800px, 90vw)',
          height: '80vh',
          background: '#F8F8F7',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between shrink-0 border-b"
          style={{
            height: '56px',
            padding: '0 24px',
            background: '#FFFFFF',
            borderColor: 'var(--border-default)',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
          }}
        >
          <h3
            id="modal-title"
            className="text-[17px] font-semibold"
            style={{ color: '#002C61' }}
          >
            {endpointsByDomain.reduce((sum, d) => sum + d.count, 0)} API Endpoints
          </h3>

          <div className="flex items-center gap-3">
            {/* Copy button */}
            <button
              ref={copyButtonRef}
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[14px] font-medium transition-all duration-200"
              style={{
                color: copied ? '#10B981' : '#0081F2',
                background: copied ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0, 129, 242, 0.08)',
                border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 129, 242, 0.2)'}`,
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>

            {/* Close button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto p-6"
          style={{
            fontFamily: "'DM Sans Variable', sans-serif",
          }}
        >
          <pre
            className="whitespace-pre-wrap text-[14px] leading-relaxed"
            style={{
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
            }}
          >
            {formattedList}
          </pre>
        </div>
      </div>
    </>
  )
}
