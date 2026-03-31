import path from 'node:path'

export const REVIEW_STATE_PATH = path.join(
  process.cwd(),
  'src/domain/intent-model/review-state.json'
)

export const MODEL_HISTORY_PATH = path.join(process.cwd(), 'model-history.json')

export const BRD_OUTPUT_PATH = path.join(process.cwd(), 'docs', 'generated', 'BRD.md')
