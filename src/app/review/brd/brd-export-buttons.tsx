'use client'

import { useCallback } from 'react'
import { Printer, Download } from 'lucide-react'

export function BRDExportButtons({ version }: { version: string }) {
  const handleExportPDF = useCallback(() => {
    window.print()
  }, [])

  const handleExportMarkdown = useCallback(async () => {
    const res = await fetch('/api/brd')
    const text = await res.text()
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BRD-v${version}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [version])

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleExportMarkdown}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 hover:bg-black/[0.04] print:hidden"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Download size={13} />
        Export Markdown
      </button>
      <button
        type="button"
        onClick={handleExportPDF}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 print:hidden"
        style={{
          color: 'var(--bg-white)',
          background: 'var(--acfs-navy)',
        }}
      >
        <Printer size={13} />
        Export PDF
      </button>
    </div>
  )
}
