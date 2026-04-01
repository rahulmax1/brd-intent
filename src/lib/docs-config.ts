import { join } from 'node:path'
import { readdirSync } from 'node:fs'

export type DocCategory = 'project' | 'build-log' | 'uploads'

export type DocEntry = {
  slug: string
  label: string
  path: string
  category: DocCategory
  type?: 'md' | 'pdf'
}

const ROOT = process.cwd()
const DOCS = join(ROOT, 'docs')
const UPLOADS_DIR = join(DOCS, 'uploads')

const staticDocs: DocEntry[] = [
  // Project documentation
  { slug: 'getting-started', label: 'Getting Started Guide', path: join(DOCS, 'getting-started.md'), category: 'project' },
  { slug: 'ai-journey', label: 'AI Journey Playbook — How It Works', path: join(DOCS, 'ai-journey-playbook.md'), category: 'project' },
  { slug: 'prompts-guide', label: 'Prompts Guide — AI Examples', path: join(DOCS, 'prompts-guide.md'), category: 'project' },
  { slug: 'workflows', label: 'Workflows — Pentest Process', path: join(DOCS, 'workflows.md'), category: 'project' },
  { slug: 'scripts-reference', label: 'Scripts Reference', path: join(DOCS, 'scripts-reference.md'), category: 'project' },
  { slug: 'deployment', label: 'Deployment Guide — Vercel', path: join(DOCS, 'deployment.md'), category: 'project' },

  // Build log - keep Rahul's specs as examples
  { slug: 'spec-ai-editor', label: 'AI Model Editor Design', path: join(DOCS, 'superpowers', 'specs', '2026-03-17-ai-model-editor-design.md'), category: 'build-log' },
  { slug: 'plan-ai-editor', label: 'AI Model Editor Plan', path: join(DOCS, 'superpowers', 'plans', '2026-03-17-ai-model-editor.md'), category: 'build-log' },
  { slug: 'spec-adapt', label: 'Adapt Canvas Design', path: join(DOCS, 'superpowers', 'specs', '2026-03-31-adapt-pentest-tool-design.md'), category: 'build-log' },
]

function getUploadedDocs(): DocEntry[] {
  try {
    const files = readdirSync(UPLOADS_DIR)
    return files
      .filter(f => f.endsWith('.md') || f.endsWith('.pdf'))
      .map(f => {
        const ext = f.endsWith('.pdf') ? 'pdf' : 'md'
        const baseName = f.replace(/\.[^.]+$/, '')
        const label = baseName
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
        return {
          slug: `upload-${baseName}`,
          label,
          path: join(UPLOADS_DIR, f),
          category: 'uploads' as DocCategory,
          type: ext as 'md' | 'pdf',
        }
      })
  } catch {
    return []
  }
}

export function getAllDocs(): DocEntry[] {
  return [...staticDocs, ...getUploadedDocs()]
}

export function getDoc(slug: string): DocEntry | undefined {
  return getAllDocs().find(d => d.slug === slug)
}

export const categories = [
  { key: 'project' as const, label: 'Documentation' },
  { key: 'build-log' as const, label: 'Architecture & Design' },
  { key: 'uploads' as const, label: 'Uploads' },
]

// Re-export for backwards compat
export const docs = staticDocs
