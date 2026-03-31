import { intentModel } from '../src/domain/intent-model/model'
import { exportContract } from '../src/lib/contract-export'

const ok = exportContract(intentModel)
if (ok) {
  console.log(`Contract exported (v${intentModel.meta.version}, ${intentModel.businessRules.length} rules, ${intentModel.entities.filter(e => !e.is_integration).length} entities)`)
} else {
  console.error('Portal directory not found at ../vbs-portal — skipping export')
  process.exit(1)
}
