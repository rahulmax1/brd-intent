import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Redirect old /review URLs to new structure
      {
        source: '/review',
        destination: '/consensus',
        permanent: true,
      },
      {
        source: '/review/actors',
        destination: '/actors',
        permanent: true,
      },
      {
        source: '/review/entities',
        destination: '/entities',
        permanent: true,
      },
      {
        source: '/review/journeys',
        destination: '/journeys',
        permanent: true,
      },
      {
        source: '/review/business_rules',
        destination: '/rules',
        permanent: true,
      },
      {
        source: '/review/constraints',
        destination: '/constraints',
        permanent: true,
      },
      {
        source: '/review/questions',
        destination: '/questions',
        permanent: true,
      },
      {
        source: '/review/brd',
        destination: '/brd',
        permanent: true,
      },
      {
        source: '/review/api-endpoints',
        destination: '/api-spec',
        permanent: true,
      },
      {
        source: '/review/ia',
        destination: '/architecture',
        permanent: true,
      },
      {
        source: '/review/data-model',
        destination: '/data-model',
        permanent: true,
      },
      {
        source: '/review/diff',
        destination: '/versions',
        permanent: true,
      },
      {
        source: '/review/docs',
        destination: '/documents',
        permanent: true,
      },
      // Catch-all: redirect any other /review/* paths to home
      {
        source: '/review/:path*',
        destination: '/',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
