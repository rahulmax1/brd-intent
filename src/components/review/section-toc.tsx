'use client'

import { useEffect, useState, useRef } from 'react'
import type { SectionReview, SectionType } from '@/domain/intent-model/types'

type ModelItem = { id: string; name?: string; [key: string]: unknown }

type SectionTocProps = {
  items: Array<{
    item: ModelItem
    type: SectionType
    review: SectionReview
  }>
  scrollContainer: HTMLElement | null
  onItemClick: (targetId: string) => void
}

export function SectionToc({ items, scrollContainer, onItemClick }: SectionTocProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!scrollContainer) return

    const handleScroll = () => {
      const scrolled = scrollContainer.scrollTop > 100
      setIsVisible(scrolled)
    }

    handleScroll()
    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [scrollContainer])

  useEffect(() => {
    if (!scrollContainer) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        root: scrollContainer,
        rootMargin: '-20% 0px -80% 0px',
        threshold: 0,
      }
    )

    const elements = items.map(({ review }) =>
      document.getElementById(review.targetId)
    ).filter(Boolean) as HTMLElement[]

    elements.forEach((el) => observerRef.current?.observe(el))

    return () => {
      observerRef.current?.disconnect()
    }
  }, [items, scrollContainer])

  const getDisplayName = (item: ModelItem) => {
    return item.name || item.id
  }

  return (
    <aside
      className="shrink-0 transition-all duration-200 overflow-hidden"
      style={{
        width: isVisible ? '200px' : '0',
        opacity: isVisible ? 1 : 0,
      }}
    >
      <div className="w-[200px] h-full overflow-y-auto custom-scroll pr-4">
        <nav>
          <ul className="space-y-0.5">
            {items.map(({ item, review }) => {
              const isActive = activeId === review.targetId
              return (
                <li key={review.targetId}>
                  <button
                    type="button"
                    onClick={() => onItemClick(review.targetId)}
                    className="w-full text-left text-xs py-1.5 px-2 rounded transition-all duration-200"
                    style={{
                      color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
                      background: isActive ? 'var(--bg-blue-subtle)' : 'transparent',
                      fontWeight: isActive ? 600 : 400,
                      borderLeft: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                    }}
                  >
                    {getDisplayName(item)}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
