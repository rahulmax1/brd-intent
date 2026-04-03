'use client'

import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'

type Step = {
  id: string
  label: string
  href: string
  phase: string
}

type ProjectStepperProps = {
  projectId: string
  currentPhase: string
  currentStep: string
}

const steps: Step[] = [
  { id: 'upload', label: 'Upload', href: '/upload', phase: 'UPLOAD' },
  { id: 'draft', label: 'Draft', href: '/draft', phase: 'DRAFT' },
  { id: 'review', label: 'Review', href: '/review', phase: 'REVIEW' },
  { id: 'consensus', label: 'Consensus', href: '/consensus', phase: 'CONSENSUS' },
  { id: 'export', label: 'Export', href: '/export', phase: 'EXPORT' },
]

const phaseOrder = ['UPLOAD', 'DRAFT', 'REVIEW', 'CONSENSUS', 'EXPORT']

export function ProjectStepper({ projectId, currentPhase, currentStep }: ProjectStepperProps) {
  const currentPhaseIndex = phaseOrder.indexOf(currentPhase)

  function getStepStatus(step: Step) {
    const stepIndex = phaseOrder.indexOf(step.phase)

    if (stepIndex < currentPhaseIndex) return 'completed'
    if (step.id === currentStep) return 'current'
    if (stepIndex === currentPhaseIndex) return 'current'
    return 'upcoming'
  }

  function isStepClickable(step: Step) {
    const stepIndex = phaseOrder.indexOf(step.phase)
    return stepIndex <= currentPhaseIndex
  }

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        <nav className="flex items-center justify-between py-4">
          {steps.map((step, index) => {
            const status = getStepStatus(step)
            const isClickable = isStepClickable(step)
            const isCurrent = status === 'current'
            const isCompleted = status === 'completed'

            const content = (
              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle
                    className={`h-5 w-5 ${
                      isCurrent ? 'text-blue-600 fill-blue-600' : 'text-gray-300'
                    }`}
                  />
                )}
                <span
                  className={`text-sm font-medium ${
                    isCurrent
                      ? 'text-blue-600'
                      : isCompleted
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            )

            return (
              <div key={step.id} className="flex items-center">
                {isClickable ? (
                  <Link
                    href={`/projects/${projectId}${step.href}`}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      isCurrent ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="px-4 py-2 cursor-not-allowed opacity-50">
                    {content}
                  </div>
                )}

                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-px mx-2 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
