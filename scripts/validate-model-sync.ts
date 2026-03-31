import { intentModel } from '../src/domain/intent-model/model'
import { validateModelSync } from '../src/lib/model-sync-validator'

async function main() {
  console.log('🔍 Validating intent model sync...\n')

  const result = await validateModelSync(intentModel)

  if (result.issues.length === 0) {
    console.log('✅ All validation checks passed!\n')
    process.exit(0)
  }

  // Group issues by severity
  const errors = result.issues.filter(i => i.severity === 'error')
  const warnings = result.issues.filter(i => i.severity === 'warning')

  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} error(s):\n`)
    for (const issue of errors) {
      console.log(`   [${issue.type}] ${issue.message}`)
      if (issue.fix) {
        console.log(`   → Fix: ${issue.fix}`)
      }
      console.log()
    }
  }

  if (warnings.length > 0) {
    console.log(`⚠️  Found ${warnings.length} warning(s):\n`)
    for (const issue of warnings) {
      console.log(`   [${issue.type}] ${issue.message}`)
      if (issue.fix) {
        console.log(`   → Fix: ${issue.fix}`)
      }
      console.log()
    }
  }

  if (result.suggestions.length > 0) {
    console.log('💡 Suggestions:\n')
    for (const suggestion of result.suggestions) {
      console.log(`   • ${suggestion}`)
    }
    console.log()
  }

  // Exit with error code if there are errors
  process.exit(result.valid ? 0 : 1)
}

main().catch(error => {
  console.error('❌ Validation script failed:', error)
  process.exit(1)
})
