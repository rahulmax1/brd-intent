'use client'

import { useState, useMemo, useEffect } from 'react'
import { endpointsByDomain, endpointStats } from '@/lib/api-endpoints-data'
import { UuidAlert } from './uuid-alert'
import { Filters, type FilterState } from './filters'
import { EndpointCard } from './endpoint-card'
import { ConsolidationAnalysis } from './consolidation-analysis'
import { ChevronDown, ChevronRight, List } from 'lucide-react'
import { ApiListModal } from './api-list-modal'

export default function ApiEndpointsPage() {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    domains: [],
    methods: [],
    auth: [],
  })

  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set())
  const [showListModal, setShowListModal] = useState(false)

  // Load collapsed state from localStorage after mount (client-only)
  useEffect(() => {
    const saved = localStorage.getItem('api-endpoints-collapsed-domains')
    if (saved) {
      setCollapsedDomains(new Set(JSON.parse(saved)))
    }
  }, [])

  const toggleDomain = (domain: string) => {
    const newCollapsed = new Set(collapsedDomains)
    if (newCollapsed.has(domain)) {
      newCollapsed.delete(domain)
    } else {
      newCollapsed.add(domain)
    }
    setCollapsedDomains(newCollapsed)

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('api-endpoints-collapsed-domains', JSON.stringify(Array.from(newCollapsed)))
    }
  }

  // Filter endpoints
  const filteredDomains = useMemo(() => {
    return endpointsByDomain.map(domain => {
      const filtered = domain.endpoints.filter(endpoint => {
        // Search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          const matchesSearch =
            endpoint.id.toLowerCase().includes(searchLower) ||
            endpoint.path.toLowerCase().includes(searchLower) ||
            endpoint.description.toLowerCase().includes(searchLower) ||
            endpoint.method.toLowerCase().includes(searchLower)
          if (!matchesSearch) return false
        }

        // Method filter
        if (filters.methods.length > 0 && !filters.methods.includes(endpoint.method)) {
          return false
        }

        // Auth filter
        if (filters.auth.length > 0) {
          const hasAuth = filters.auth.some(auth => endpoint.auth.includes(auth))
          if (!hasAuth) return false
        }

        return true
      })

      return {
        ...domain,
        endpoints: filtered,
        filteredCount: filtered.length,
      }
    }).filter(domain => domain.filteredCount > 0) // Hide empty domains
  }, [filters])

  const totalFiltered = filteredDomains.reduce((sum, d) => sum + d.filteredCount, 0)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex h-[54px] shrink-0 items-center justify-between border-b px-6"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
              API Endpoints
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Portal API Reference & Analysis
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowListModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-[14px] font-medium rounded-lg transition-all duration-200 hover:bg-blue-50"
            style={{
              color: '#0081F2',
            }}
          >
            <List size={16} />
            Show All
          </button>
        </div>

        <div className="flex gap-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          <span><strong>{endpointStats.total}</strong> endpoints</span>
          <span><strong>{endpointsByDomain.length}</strong> domains</span>
          <span><strong>{endpointStats.usesUuid}</strong> use UUIDs</span>
        </div>
      </div>

      {/* UUID Alert */}
      <UuidAlert />

      {/* Filters */}
      <Filters onFilterChange={setFilters} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        <div className="px-6 py-8">

          {/* Showing N of M message */}
          {filters.search || filters.methods.length > 0 || filters.auth.length > 0 ? (
            <p className="mb-6 text-[14px]" style={{ color: 'var(--text-muted)' }}>
              Showing <strong>{totalFiltered}</strong> of <strong>{endpointStats.total}</strong> endpoints
            </p>
          ) : null}

          {/* Endpoint Catalog */}
          <div className="space-y-8 mb-12">
            {filteredDomains.map(domain => (
              <div key={domain.domain} className="space-y-4">
                {/* Domain header (collapsible) */}
                <button
                  onClick={() => toggleDomain(domain.domain)}
                  className="flex items-center gap-2 w-full group"
                >
                  {collapsedDomains.has(domain.domain) ? (
                    <ChevronRight size={20} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                  ) : (
                    <ChevronDown size={20} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                  )}
                  <h3
                    className="text-[17px] font-semibold group-hover:text-blue-600 transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {domain.domain}
                  </h3>
                  <span
                    className="text-[14px] px-2.5 py-0.5 rounded-full"
                    style={{ background: 'var(--bg-card-gray)', color: 'var(--text-muted)' }}
                  >
                    {domain.filteredCount}
                  </span>
                </button>

                {/* Endpoint cards */}
                {!collapsedDomains.has(domain.domain) && (
                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {domain.endpoints.map(endpoint => (
                      <EndpointCard key={endpoint.id} endpoint={endpoint} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Consolidation Analysis */}
          <div
            className="border-t pt-10"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <ConsolidationAnalysis />
          </div>
        </div>
      </div>

      {/* API List Modal */}
      <ApiListModal open={showListModal} onClose={() => setShowListModal(false)} />
    </div>
  )
}
