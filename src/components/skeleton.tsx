export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 ${className}`}
    />
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>

      <div className="mb-6">
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  )
}

export function ProjectsListSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <ProjectCardSkeleton />
      <ProjectCardSkeleton />
      <ProjectCardSkeleton />
    </div>
  )
}

export function DocumentRowSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3 flex-1">
        <Skeleton className="h-5 w-5 rounded" />
        <div className="flex-1">
          <Skeleton className="h-4 w-48 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  )
}

export function ModelSectionSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-3">
        <ModelItemSkeleton />
        <ModelItemSkeleton />
        <ModelItemSkeleton />
      </div>
    </div>
  )
}

export function ModelItemSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <Skeleton className="h-5 w-2/3 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  )
}

export function ReviewItemSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Skeleton className="h-5 w-1/2 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <Skeleton className="h-20 w-full mb-3 rounded-lg" />

      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  )
}

export function ArtifactCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-white">
      <div className="flex items-start gap-3">
        <Skeleton className="h-5 w-5 rounded" />
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </div>
  )
}
