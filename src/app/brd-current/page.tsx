'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { FileText, AlertCircle } from 'lucide-react'

export default function BRDCurrentPage() {
  // This will be the path to your BRD PDF once you add it
  // For now, showing placeholder
  const brdPdfPath = '/docs/current-brd.pdf'
  const [pdfError, setPdfError] = useState(false)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Breadcrumb */}
      <div className="px-8 pt-6 pb-4">
        <Breadcrumb
          items={[
            { label: 'BRD & Discussions', href: '/#brd-discussions' },
            { label: 'Current BRD' },
          ]}
        />
      </div>

      {/* Page Content */}
      <div className="flex-1 flex flex-col px-8 pb-8 overflow-hidden">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Current BRD
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Original business requirements document
          </p>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 flex flex-col rounded-lg overflow-hidden" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)' }}>
          {pdfError ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12">
              <AlertCircle size={48} className="mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                No BRD PDF found
              </h2>
              <p className="text-sm text-center max-w-md mb-6" style={{ color: 'var(--text-secondary)' }}>
                Add your BRD PDF to the codebase at <code className="px-2 py-0.5 rounded" style={{ background: 'var(--bg-gray-subtle)' }}>public/docs/current-brd.pdf</code>
              </p>
              <div className="text-xs p-4 rounded" style={{ background: 'var(--bg-blue-subtle)', color: 'var(--text-secondary)' }}>
                <p className="mb-2"><strong>Steps to add your BRD:</strong></p>
                <ol className="space-y-1 ml-4 list-decimal">
                  <li>Place your PDF in <code>public/docs/current-brd.pdf</code></li>
                  <li>Refresh this page</li>
                  <li>The PDF will be displayed here</li>
                </ol>
              </div>
            </div>
          ) : (
            <iframe
              src={`${brdPdfPath}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
              className="w-full flex-1"
              title="Current BRD"
              onError={() => setPdfError(true)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
