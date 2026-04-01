import { generateApiId } from './seeded-random'

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export type ParameterLocation = 'path' | 'query' | 'body'

export interface ApiParameter {
  name: string
  location: ParameterLocation
  type: string // 'UUID' | 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object'
  description: string
  required: boolean
  example?: string
}

export interface ApiEndpoint {
  id: string // API-H729
  domain: string // 'HBLs/Shipments'
  domainLetter: string // 'H'
  method: HttpMethod
  path: string // '/api/hbls'
  description: string
  parameters: ApiParameter[]
  auth: string[] // ['LSP', 'ACFS', 'P4TC']
  response: string
  usesUuid: boolean // true if path contains :id or similar
  tables?: string[] // schema tables used
  phaseDeferred?: boolean // true for P4TC endpoints
}

export interface DomainGroup {
  domain: string
  domainLetter: string
  count: number
  endpoints: ApiEndpoint[]
}

// Export generateApiId for use when seeding endpoint data
export { generateApiId }

// ============================================================================
// API Endpoints
// ============================================================================
// Add your API endpoints here based on your intent model journeys and entities

const allEndpoints: Omit<ApiEndpoint, 'id'>[] = [
  // Example:
  // {
  //   domain: 'Users',
  //   domainLetter: 'U',
  //   method: 'GET',
  //   path: '/api/users',
  //   description: 'List all users',
  //   parameters: [],
  //   auth: ['admin'],
  //   response: 'Array of user objects',
  //   usesUuid: false,
  // },
]

// Add IDs to endpoints
const endpointsWithIds: ApiEndpoint[] = allEndpoints.map((endpoint, index) => ({
  ...endpoint,
  id: generateApiId(endpoint.domainLetter, index.toString()),
}))

// Group by domain
export const endpointsByDomain: DomainGroup[] = endpointsWithIds.reduce((acc, endpoint) => {
  let group = acc.find(g => g.domain === endpoint.domain)
  if (!group) {
    group = {
      domain: endpoint.domain,
      domainLetter: endpoint.domainLetter,
      count: 0,
      endpoints: [],
    }
    acc.push(group)
  }
  group.endpoints.push(endpoint)
  group.count++
  return acc
}, [] as DomainGroup[])

// Stats
export const endpointStats = {
  total: endpointsWithIds.length,
  byMethod: {
    GET: endpointsWithIds.filter(e => e.method === 'GET').length,
    POST: endpointsWithIds.filter(e => e.method === 'POST').length,
    PATCH: endpointsWithIds.filter(e => e.method === 'PATCH').length,
    DELETE: endpointsWithIds.filter(e => e.method === 'DELETE').length,
  },
  byDomain: endpointsByDomain.map(d => ({ domain: d.domain, count: d.count })),
  usesUuid: endpointsWithIds.filter(e => e.usesUuid).length,
}
