import { NavSidebar } from '@/components/review/nav-links'
import { HomeCards } from '@/components/home/home-cards'

export default function HomePage() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      <NavSidebar />
      <div className="flex-1 overflow-y-auto">
        <HomeCards />
      </div>
    </div>
  )
}
