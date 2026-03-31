import type { DomainGroup } from './api-endpoints-data'

export function formatEndpointsList(domains: DomainGroup[]): string {
  const totalCount = domains.reduce((sum, d) => sum + d.count, 0)

  let output = `${totalCount} API endpoints total\n\n`
  output += 'Broken down by domain:\n'

  let counter = 1

  for (const domain of domains) {
    output += `\n${domain.domain} (${domain.count})\n`

    for (const endpoint of domain.endpoints) {
      output += `${counter}. ${endpoint.method} ${endpoint.path} – ${endpoint.description}\n`
      counter++
    }
  }

  return output
}
