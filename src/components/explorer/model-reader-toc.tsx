'use client'

import { useEffect, useState, useRef } from 'react'
import type { IntentModel } from '@/domain/intent-model/types'

type TocItem = {
  id: string
  label: string
  section: string
}

type ModelReaderTocProps = {
  model: IntentModel
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function ModelReaderToc({ model, containerRef }: ModelReaderTocProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Build TOC items
  const items: TocItem[] = [
    ...model.actors.map(a => ({ id: `actor-${a.id}`, label: a.name, section: 'actors' })),
    ...model.entities.filter(e => !e.is_integration).map(e => ({ id: `entity-${e.id}`, label: e.name, section: 'entities' })),
    ...model.entities.filter(e => e.is_integration).map(e => ({ id: `entity-${e.id}`, label: e.name, section: 'integrations' })),
    ...model.journeys.map(j => ({ id: `journey-${j.id}`, label: j.name, section: 'journeys' })),
    ...model.businessRules.map(r => ({ id: `rule-${r.id}`, label: r.id, section: 'businessRules' })),
    ...model.constraints.map(c => ({ id: `constraint-${c.id}`, label: c.id, section: 'constraints' })),
    ...model.openQuestions.map(q => ({ id: `question-${q.id}`, label: q.id, section: 'openQuestions' })),
  ]

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrolled = container.scrollTop > 200
      setIsVisible(scrolled)
    }

    handleScroll()
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [containerRef])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        root: container,
        rootMargin: '-20% 0px -80% 0px',
        threshold: 0,
      }
    )

    const elements = items.map(({ id }) =>
      document.getElementById(id)
    ).filter(Boolean) as HTMLElement[]

    elements.forEach((el) => observerRef.current?.observe(el))

    return () => {
      observerRef.current?.disconnect()
    }
  }, [items, containerRef])

  const handleClick = (itemId: string) => {
    const element = document.getElementById(itemId)
    const container = containerRef.current
    if (element && container) {
      const elementTop = element.offsetTop
      const containerTop = container.offsetTop
      container.scrollTo({ top: elementTop - containerTop - 100, behavior: 'smooth' })
    }
  }

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 shrink-0 transition-all duration-200 overflow-hidden z-20"
      style={{
        width: isVisible ? '240px' : '0',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div
        className="w-[240px] h-full overflow-y-auto custom-scroll pt-24 pb-8 pl-6 pr-4"
        style={{ background: 'var(--bg-page)' }}
      >
        <nav>
          <ul className="space-y-0.5">
            {items.map(({ id, label }) => {
              const isActive = activeId === id
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => handleClick(id)}
                    className="w-full text-left text-xs py-1.5 px-2 rounded transition-all duration-200"
                    style={{
                      color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
                      background: isActive ? 'var(--bg-blue-subtle)' : 'transparent',
                      fontWeight: isActive ? 600 : 400,
                      borderLeft: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                    }}
                  >
                    {label}
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
