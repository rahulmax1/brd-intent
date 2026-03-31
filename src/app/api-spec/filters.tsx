'use client'

import { useState } from 'react'
import type { HttpMethod } from '@/lib/api-endpoints-data'

interface FiltersProps {
  onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
  search: string
  domains: string[]
  methods: HttpMethod[]
  auth: string[]
}

export function Filters({ onFilterChange }: FiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    domains: [],
    methods: [],
    auth: [],
  })

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilters({ search: e.target.value })
  }

  const toggleMethod = (method: HttpMethod) => {
    const newMethods = filters.methods.includes(method)
      ? filters.methods.filter(m => m !== method)
      : [...filters.methods, method]
    updateFilters({ methods: newMethods })
  }

  const toggleAuth = (authType: string) => {
    const newAuth = filters.auth.includes(authType)
      ? filters.auth.filter(a => a !== authType)
      : [...filters.auth, authType]
    updateFilters({ auth: newAuth })
  }

  const clearFilters = () => {
    updateFilters({ search: '', domains: [], methods: [], auth: [] })
  }

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    filters.domains.length +
    filters.methods.length +
    filters.auth.length

  return (
    <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={filters.search}
          onChange={handleSearchChange}
          placeholder="Search endpoints, paths, descriptions..."
          className="w-full px-4 py-2 rounded-lg border text-[14px]"
          style={{
            borderColor: 'var(--border-default)',
            backgroundColor: 'white',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
          Filter by:
        </span>

        {/* Method filters */}
        <div className="flex gap-2">
          {(['GET', 'POST', 'PATCH', 'DELETE'] as HttpMethod[]).map(method => (
            <button
              key={method}
              onClick={() => toggleMethod(method)}
              className={`px-3 py-1 text-[12px] font-medium rounded-full border transition-all ${
                filters.methods.includes(method)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        {/* Auth filters */}
        <div className="flex gap-2">
          {['LSP', 'ACFS', 'P4TC'].map(authType => (
            <button
              key={authType}
              onClick={() => toggleAuth(authType)}
              className={`px-3 py-1 text-[12px] font-medium rounded-full border transition-all ${
                filters.auth.includes(authType)
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {authType}
            </button>
          ))}
        </div>

        {/* Clear button */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="ml-2 px-3 py-1 text-[12px] font-medium text-slate-600 hover:text-slate-800 underline"
          >
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  )
}
