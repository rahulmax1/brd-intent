import {
  consolidationSummary,
  domainConsolidations,
  consolidationPrinciples,
} from '@/lib/api-consolidation-data'

export function ConsolidationAnalysis() {
  return (
    <div className="px-6 py-10">
      <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--acfs-navy)' }}>
        Consolidation Analysis
      </h2>

      {/* Summary Card */}
      <div
        className="rounded-lg border p-6 mb-8"
        style={{
          background: '#F8F8F7',
          borderColor: 'var(--border-default)',
        }}
      >
        <h3 className="text-[17px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Validation Summary
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4">
          <div>
            <p className="text-[13px] mb-1" style={{ color: 'var(--text-muted)' }}>Initial Proposal</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {consolidationSummary.initialProposal}
            </p>
          </div>
          <div>
            <p className="text-[13px] mb-1" style={{ color: 'var(--text-muted)' }}>Validated</p>
            <p className="text-2xl font-bold text-emerald-600">
              {consolidationSummary.validated}
            </p>
          </div>
          <div>
            <p className="text-[13px] mb-1" style={{ color: 'var(--text-muted)' }}>Net Change</p>
            <p className="text-2xl font-bold text-blue-600">
              {consolidationSummary.netChange}
            </p>
          </div>
          <div>
            <p className="text-[13px] mb-1" style={{ color: 'var(--text-muted)' }}>Reduction</p>
            <p className="text-2xl font-bold text-slate-600">
              {Math.abs(Math.round((consolidationSummary.netChange / consolidationSummary.initialProposal) * 100))}%
            </p>
          </div>
        </div>

        <div className="flex gap-6 text-[14px] pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            <strong className="text-red-600">{consolidationSummary.removed}</strong> removed
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            <strong className="text-emerald-600">{consolidationSummary.added}</strong> added
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            <strong className="text-slate-600">{consolidationSummary.kept}</strong> kept
          </span>
        </div>

        <p className="mt-4 text-[14px] leading-6" style={{ color: 'var(--text-muted)' }}>
          <strong>Strategy:</strong> RESTful patterns, fill schema gaps, defer P4TC to fast follow
        </p>
      </div>

      {/* Domain-by-domain breakdown */}
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        By Domain
      </h3>

      <div className="space-y-6 mb-10">
        {domainConsolidations.map(domain => (
          <div
            key={domain.domain}
            className="rounded-lg border p-5"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <div className="flex items-baseline gap-3 mb-4">
              <h4 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {domain.domain}
              </h4>
              <span className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                {domain.currentCount} → {domain.proposedCount} endpoints
                {domain.savings !== 0 && (
                  <span className={domain.savings > 0 ? 'text-emerald-600' : 'text-amber-600'}>
                    {' '}({domain.savings > 0 ? '-' : '+'}{Math.abs(domain.savings)})
                  </span>
                )}
              </span>
            </div>

            <ul className="space-y-3">
              {domain.changes.map((change, idx) => (
                <li
                  key={idx}
                  className="text-[14px] leading-6 pl-4 border-l-2"
                  style={{
                    borderColor: change.type === 'removed' ? '#ef4444' :
                                 change.type === 'added' ? '#10b981' : '#64748b',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className={`
                      shrink-0 text-[11px] font-bold px-2 py-0.5 rounded uppercase
                      ${change.type === 'removed' ? 'bg-red-100 text-red-700' :
                        change.type === 'added' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'}
                    `}>
                      {change.type}
                    </span>
                    {change.endpoint && (
                      <code className="text-xs font-mono">{change.endpoint}</code>
                    )}
                  </div>

                  {change.path && (
                    <code className="block mt-1 text-xs font-mono">{change.path}</code>
                  )}

                  <p className="mt-1">{change.rationale}</p>

                  {change.alternative && (
                    <p className="mt-1 text-[13px] italic" style={{ color: 'var(--text-muted)' }}>
                      → {change.alternative}
                    </p>
                  )}

                  {change.status === 'deferred' && (
                    <span className="inline-block mt-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      ⏸️ DEFERRED
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* REST Principles */}
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Consolidation Principles
      </h3>

      <div className="space-y-3">
        {consolidationPrinciples.map((principle, idx) => (
          <div
            key={idx}
            className="rounded-lg border p-4"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              {idx + 1}. {principle.title}
            </p>
            <p className="text-[14px] mb-2" style={{ color: 'var(--text-secondary)' }}>
              {principle.description}
            </p>
            {principle.examples.map((example, exIdx) => (
              <code
                key={exIdx}
                className="block text-[12px] font-mono mt-1 px-3 py-1.5 rounded"
                style={{ background: '#F8F8F7', color: 'var(--text-muted)' }}
              >
                {example}
              </code>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
