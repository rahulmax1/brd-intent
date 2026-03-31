'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import type { SectionReview } from '@/domain/intent-model/types'

type ReviewControlsProps = {
  section: SectionReview
}

function CommentThread({ comments }: { comments: SectionReview['comments'] }) {
  if (comments.length === 0) return null
  return (
    <div className="space-y-3 mb-4">
      {comments.map((c, i) => (
        <div key={i} className="text-sm">
          <p style={{ color: 'var(--text-primary)' }}>{c.text}</p>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date(c.timestamp).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ReviewControls({ section }: ReviewControlsProps) {
  const router = useRouter()
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(action: 'approve' | 'dispute' | 'comment') {
    if (action === 'comment' && !comment.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: section.targetId,
          action,
          comment: comment || undefined,
        }),
      })
      if (res.ok) {
        setComment('')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <CommentThread comments={section.comments} />

      <Textarea
        placeholder="Add a comment..."
        value={comment}
        onChange={e => setComment(e.target.value)}
        className="min-h-[72px] text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => submit('approve')}
          disabled={loading}
          className="rounded-[10px] px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-50"
          style={{ background: 'var(--acfs-navy)', color: 'var(--text-white)' }}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => submit('dispute')}
          disabled={loading}
          className="rounded-[10px] px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-50"
          style={{ background: 'transparent', color: '#BE123C', border: '1px solid #E11D48' }}
        >
          Dispute
        </button>
        {comment.trim() && (
          <button
            type="button"
            onClick={() => submit('comment')}
            disabled={loading}
            className="rounded-[10px] px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}
          >
            Comment only
          </button>
        )}
      </div>
    </div>
  )
}
