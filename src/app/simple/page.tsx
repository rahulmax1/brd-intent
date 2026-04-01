import { intentModel } from '@/domain/intent-model/model'
import { projectConfig } from '@/lib/project-config'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default function SimplePage() {
  const { actors, entities, journeys } = intentModel

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Derived Artefacts', href: '/#derived-artefacts' },
              { label: 'Simple Version' },
            ]}
          />
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Simple Version
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Plain language summary of {projectConfig.name}
          </p>
        </div>

        {/* What is this project? */}
        <div className="mb-12 p-8 rounded-lg" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)' }}>
          <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            What is this project?
          </h2>
          <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            {projectConfig.brd.introText.replace('{project}', projectConfig.name)}
          </p>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {projectConfig.brd.scopeText}
          </p>
        </div>

        {/* Who's involved? */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Who's involved?
          </h2>
          <div className="space-y-4">
            {actors.length > 0 ? (
              actors.map(actor => (
                <div
                  key={actor.id}
                  className="p-6 rounded-lg"
                  style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)' }}
                >
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {actor.name}
                  </h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {actor.description}
                  </p>
                  {actor.responsibilities && actor.responsibilities.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                        What they do:
                      </p>
                      <ul className="space-y-1">
                        {actor.responsibilities.slice(0, 3).map((resp) => (
                          <li key={resp.id} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                            <span className="text-xs mt-1.5">•</span>
                            <span>{resp.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                No actors defined yet. Add actors to show who's involved in this project.
              </p>
            )}
          </div>
        </div>

        {/* What are we working with? */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            What are we working with?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entities.length > 0 ? (
              entities.map(entity => (
                <div
                  key={entity.id}
                  className="p-5 rounded-lg"
                  style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)' }}
                >
                  <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {entity.name}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {entity.description}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                No entities defined yet. Add entities to show what this project tracks or manages.
              </p>
            )}
          </div>
        </div>

        {/* How does it work? */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            How does it work?
          </h2>
          <div className="space-y-6">
            {journeys.length > 0 ? (
              journeys.slice(0, 5).map(journey => (
                <div
                  key={journey.id}
                  className="p-6 rounded-lg"
                  style={{ background: 'var(--bg-white)', border: '1px solid var(--border-default)' }}
                >
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {journey.name}
                  </h3>
                  {journey.success_outcome && (
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                      {journey.success_outcome}
                    </p>
                  )}
                  {journey.steps && journey.steps.length > 0 && (
                    <div className="flex items-start gap-2 flex-wrap">
                      {journey.steps.slice(0, 4).map((step, idx) => (
                        <div key={step.order} className="flex items-center gap-2">
                          <div
                            className="px-3 py-1.5 rounded text-xs font-medium"
                            style={{
                              background: 'var(--bg-gray-subtle)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {step.title}
                          </div>
                          {idx < Math.min(journey.steps.length, 4) - 1 && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              →
                            </span>
                          )}
                        </div>
                      ))}
                      {journey.steps.length > 4 && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          +{journey.steps.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                No journeys defined yet. Add journeys to show how work flows through the system.
              </p>
            )}
          </div>
        </div>

        {/* Footer note */}
        <div
          className="p-6 rounded-lg"
          style={{ background: 'var(--bg-blue-subtle)', border: '1px solid var(--border-default)' }}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            This is a simplified, plain-language summary of the project. For the complete technical details,
            see the <a href="/brd" className="underline" style={{ color: 'var(--accent-blue)' }}>Generated BRD</a> or
            explore the <a href="/actors" className="underline" style={{ color: 'var(--accent-blue)' }}>Intent Model</a> directly.
          </p>
        </div>
      </div>
    </div>
  )
}
