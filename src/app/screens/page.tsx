import { intentModel } from '@/domain/intent-model/model'
import { Layers, Users, ArrowRight } from 'lucide-react'

type Screen = {
  id: string
  name: string
  journeyId: string
  journeyName: string
  actors: string[]
  entities: string[]
  purpose: string
}

function generateScreensFromModel(): Screen[] {
  const screens: Screen[] = []

  // Generate screens from journey steps
  intentModel.journeys.forEach(journey => {
    if (!journey.steps) return

    journey.steps.forEach((step, idx) => {
      const screenId = `${journey.id}-step-${idx + 1}`
      const screenName = step.title

      // Get primary actor from journey
      const actors = journey.primary_actor ? [journey.primary_actor] : []

      // Entities are inferred from step detail (simplified for now)
      const entities: string[] = []

      screens.push({
        id: screenId,
        name: screenName,
        journeyId: journey.id,
        journeyName: journey.name,
        actors,
        entities,
        purpose: step.detail || `Screen for: ${step.title} in ${journey.name}`,
      })
    })
  })

  return screens
}

export default function ScreensPage() {
  const screens = generateScreensFromModel()
  const actorMap = new Map(intentModel.actors.map(a => [a.id, a.name]))
  const entityMap = new Map(intentModel.entities.map(e => [e.id, e.name]))

  // Group screens by journey
  const screensByJourney = screens.reduce((acc, screen) => {
    if (!acc[screen.journeyId]) {
      acc[screen.journeyId] = []
    }
    acc[screen.journeyId].push(screen)
    return acc
  }, {} as Record<string, Screen[]>)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <div className="mx-auto max-w-7xl px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Screens List
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            UI screens needed for implementation, generated from journey steps
          </p>
        </div>

        {/* Summary */}
        <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className="p-6 rounded-lg"
            style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Layers size={24} style={{ color: 'var(--accent-blue)' }} />
              <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {screens.length}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Total screens needed
            </p>
          </div>

          <div
            className="p-6 rounded-lg"
            style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <ArrowRight size={24} style={{ color: 'var(--accent-blue)' }} />
              <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {Object.keys(screensByJourney).length}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              User journeys covered
            </p>
          </div>

          <div
            className="p-6 rounded-lg"
            style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Users size={24} style={{ color: 'var(--accent-blue)' }} />
              <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {intentModel.actors.length}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Actor types using screens
            </p>
          </div>
        </div>

        {screens.length === 0 ? (
          <div
            className="p-12 rounded-lg text-center"
            style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)' }}
          >
            <Layers size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              No screens generated yet
            </h2>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Add journeys with steps to your intent model, and screens will be automatically generated
              based on the journey flows.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(screensByJourney).map(([journeyId, journeyScreens]) => {
              const journey = intentModel.journeys.find(j => j.id === journeyId)
              if (!journey) return null

              return (
                <div key={journeyId}>
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                      {journey.name}
                    </h2>
                    {journey.success_outcome && (
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Outcome: {journey.success_outcome}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {journeyScreens.map((screen, idx) => (
                      <div
                        key={screen.id}
                        className="p-6 rounded-lg"
                        style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)' }}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0"
                            style={{
                              background: 'var(--bg-blue-subtle)',
                              color: 'var(--accent-blue)',
                              fontWeight: 600,
                            }}
                          >
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                              {screen.name}
                            </h3>

                            <div className="space-y-3">
                              {screen.actors.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                    Who uses it:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {screen.actors.map(actorId => (
                                      <span
                                        key={actorId}
                                        className="px-2 py-1 rounded text-xs"
                                        style={{
                                          background: 'var(--bg-gray-subtle)',
                                          color: 'var(--text-secondary)',
                                        }}
                                      >
                                        {actorMap.get(actorId) || actorId}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {screen.entities.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                    Data shown/edited:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {screen.entities.map(entityId => (
                                      <span
                                        key={entityId}
                                        className="px-2 py-1 rounded text-xs"
                                        style={{
                                          background: 'var(--bg-blue-subtle)',
                                          color: 'var(--accent-blue)',
                                        }}
                                      >
                                        {entityMap.get(entityId) || entityId}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer note */}
        {screens.length > 0 && (
          <div
            className="mt-12 p-6 rounded-lg"
            style={{ background: 'var(--bg-blue-subtle)', border: '1px solid var(--border-default)' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <strong>Note:</strong> This screens list is automatically generated from your journey steps.
              Each step in a journey typically requires a corresponding UI screen. Use this as an implementation
              checklist and map these screens to components in your frontend repository.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
