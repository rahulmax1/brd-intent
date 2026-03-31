import { Badge } from '@/components/ui/badge'
import type { SectionReview } from '@/domain/intent-model/types'

const statusConfig = {
  approved: { label: 'Approved', variant: 'default' as const, className: 'text-xs px-2 py-0.5 bg-[#F0FDFA] text-[#115E59] border-[#14B8A6] hover:bg-[#F0FDFA]' },
  disputed: { label: 'Disputed', variant: 'default' as const, className: 'text-xs px-2 py-0.5 bg-white text-[#BE123C] border-[#E11D48] hover:bg-[#FFF1F2]' },
  pending: { label: 'Pending', variant: 'default' as const, className: 'text-xs px-2 py-0.5 bg-[#F8FAFC] text-[#475569] border-[#94A3B8] hover:bg-[#F8FAFC]' },
}

export function StatusBadge({ status }: { status: SectionReview['status'] }) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}

export function WarnBadge({ text }: { text: string }) {
  return (
    <Badge variant="default" className="text-xs px-2 py-0.5 bg-[#FFFBEB] text-[#92400E] border-[#F59E0B] hover:bg-[#FFFBEB]">
      {text}
    </Badge>
  )
}

export function EdgeBadge({ text }: { text: string }) {
  return (
    <Badge variant="default" className="text-xs px-2 py-0.5 bg-[#FFF1F2] text-[#9F1239] border-[#E11D48] hover:bg-[#FFF1F2]">
      {text}
    </Badge>
  )
}

/** Small amber circle with "?" — inline warn indicator matching the reference spec */
export function WarnIndicator({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#F59E0B] text-white text-[9px] font-bold align-middle ml-1.5 cursor-help"
      title={text}
    >
      ?
    </span>
  )
}

/** Small red circle with "!" — inline edge indicator matching the reference spec */
export function EdgeIndicator({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#E11D48] text-white text-[9px] font-bold align-middle ml-1.5 cursor-help"
      title={text}
    >
      !
    </span>
  )
}
