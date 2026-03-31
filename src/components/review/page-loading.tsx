'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'

export function PageLoading() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  // Stop loading when pathname changes (page finished loading)
  useEffect(() => {
    setLoading(false)
  }, [pathname])

  // Start loading on any internal link click
  const handleClick = useCallback((e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) return

    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('http') || href.startsWith('#') || href === pathname) return

    setLoading(true)
  }, [pathname])

  useEffect(() => {
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [handleClick])

  if (!loading) return null

  return <div className="page-loading-bar" />
}
