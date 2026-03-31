
```markdown
# Scripts Reference

Available automation scripts in Adapt Canvas and when to use them.

---

## Overview

Adapt Canvas includes several scripts for automation and code generation. Most run via `pnpm` commands defined in `package.json`.

---

## Available Scripts

### `pnpm dev`

**Purpose**: Start development server

**When to run**: Local development

**What it does**:
- Starts Next.js dev server
- Runs on port 4444
- Hot-reload enabled
- Local file-based storage

**Usage**:
```bash
pnpm dev
```

Opens at: http://localhost:4444

---

### `pnpm build`

**Purpose**: Build for production

**When to run**: Before deployment

**What it does**:
- Compiles TypeScript
- Builds Next.js app
- Generates optimized bundles
- Type checks all code

**Usage**:
```bash
pnpm build
```

**Troubleshooting**:
- If build fails, check TypeScript errors
- Run `pnpm generate:schemas` if model types changed
- Run `pnpm generate:ai-types` if AI types outdated

---

### `pnpm start`

**Purpose**: Run production build

**When to run**: Testing production build locally

**What it does**:
- Serves built application
- Runs on port 3000 (default)
- Uses production optimizations

**Usage**:
```bash
pnpm build
pnpm start
```

---

### `pnpm lint`

**Purpose**: Check code quality

**When to run**: Before commits, after code changes

**What it does**:
- Runs ESLint on `src/`
- Checks code style
- Identifies potential issues

**Usage**:
```bash
pnpm lint
```

**Fix automatically**:
```bash
pnpm lint --fix
```

---

### `pnpm generate:ai-types`

**Purpose**: Generate AI system prompt type definitions

**When to run**: After modifying `src/domain/intent-model/types.ts`

**What it does**:
1. Parses TypeScript types from `types.ts`
2. Converts to simplified string format
3. Inlines nested types for readability
4. Generates `src/lib/ai-type-definitions.ts`

**Why**: Keeps AI prompts in sync with model types

**Usage**:
```bash
pnpm generate:ai-types
```

**Output**: `src/lib/ai-type-definitions.ts`

**When NOT to run**: If you only changed model data (not types)

---

### `pnpm generate:schemas`

**Purpose**: Generate Zod validation schemas

**When to run**: After modifying `src/domain/intent-model/types.ts`

**What it does**:
1. Parses all exported types from `types.ts`
2. Generates corresponding Zod schemas
3. Handles primitives, arrays, optionals, enums, nested objects
4. Sorts schemas by dependency order
5. Generates `src/lib/model-schemas.ts`

**Why**: Runtime validation of model data

**Usage**:
```bash
pnpm generate:schemas
```

**Output**: `src/lib/model-schemas.ts`

**When NOT to run**: If you only changed model data (not types)

---

### `pnpm generate:api-stubs`

**Purpose**: Generate API route stubs from entity definitions

**When to run**: After adding new entities to model

**What it does**:
1. Parses entity definitions from model
2. Generates CRUD API route stubs
3. Creates routes in `src/app/api/[entity-name]/`
4. Includes GET, POST, PUT, DELETE handlers

**Why**: Scaffolds API routes quickly

**Usage**:
```bash
pnpm generate:api-stubs
```

**Output**: `src/app/api/[entity-id]/route.ts` files

**Note**: Generated stubs need implementation — they're starting points

---

### `pnpm generate:migration`

**Purpose**: Generate database migration from model changes

**When to run**: When model entity changes need DB schema updates

**What it does**:
1. Compares current model with previous snapshot
2. Detects entity and field changes
3. Generates migration SQL or scripts
4. Creates migration file

**Usage**:
```bash
pnpm generate:migration
```

**Output**: `migrations/YYYY-MM-DD-description.ts`

**Note**: Requires database integration (not needed for basic usage)

---

### `pnpm intent:snapshot`

**Purpose**: Create timestamped model snapshot

**When to run**:
- Before major changes
- Daily during active engagement
- At milestones (kickoff, midpoint, completion)

**What it does**:
1. Copies current `model.ts` to history folder
2. Timestamps filename
3. Preserves full model state

**Usage**:
```bash
pnpm intent:snapshot
```

**Output**: `src/domain/intent-model/history/model-YYYY-MM-DD-HHmmss.ts`

**Why**: Manual backup outside of version control system

---

### `pnpm export:contract`

**Purpose**: Export model as TypeScript contract file

**When to run**:
- Generating deliverables
- Sharing with other systems
- Archival

**What it does**:
1. Exports model types and data
2. Creates standalone TypeScript file
3. Includes all validation schemas

**Usage**:
```bash
pnpm export:contract
```

**Output**: Contract file for external use

---

### `pnpm validate:model`

**Purpose**: Check model for internal consistency

**When to run**:
- After manual edits
- Before important milestones
- When debugging issues

**What it does**:
1. Validates model structure
2. Checks all IDs are unique
3. Verifies references between sections
4. Reports inconsistencies

**Usage**:
```bash
pnpm validate:model
```

**Output**: Validation report in console

**Example issues detected**:
- Duplicate actor IDs
- Journey references non-existent actor
- Broken responsibility ID references

---

## Script Workflows

### After Modifying Types

When you edit `src/domain/intent-model/types.ts`:

```bash
pnpm generate:ai-types   # Update AI prompts
pnpm generate:schemas    # Update validation
pnpm build              # Verify everything compiles
```

### Before Important Milestone

```bash
pnpm validate:model     # Check consistency
pnpm intent:snapshot    # Create backup
git add .
git commit -m "milestone: scope approved by all stakeholders"
```

### After Manual Model Edits

```bash
pnpm validate:model     # Check for errors
pnpm lint              # Check code style
pnpm dev               # Test in browser
```

### Before Deployment

```bash
pnpm lint              # Check code quality
pnpm build             # Test production build
pnpm validate:model    # Final consistency check
```

---

## Script Internals

For developers maintaining or extending scripts:

### generate-ai-types.ts

Location: `scripts/generate-ai-types.ts`

Uses TypeScript Compiler API to parse types and generate readable format for AI.

### generate-zod-schemas.ts

Location: `scripts/generate-zod-schemas.ts`

Transforms TypeScript AST into Zod schema definitions with proper type mapping.

### validate-model-sync.ts

Location: `scripts/validate-model-sync.ts`

Checks model structure against type definitions and validates internal references.

### snapshot.sh

Location: `scripts/snapshot.sh`

Bash script that copies model.ts with timestamp.

---

## Troubleshooting Scripts

### "Module not found" errors

**Solution**: Install dependencies
```bash
rm -rf node_modules
pnpm install
```

### "Permission denied" on snapshot.sh

**Solution**: Make executable
```bash
chmod +x scripts/snapshot.sh
```

### Generated files not updating

**Solution**: Delete and regenerate
```bash
rm src/lib/ai-type-definitions.ts
pnpm generate:ai-types
```

### TypeScript errors after generate:schemas

**Cause**: Type definitions might have syntax errors

**Solution**: Check `src/domain/intent-model/types.ts` for issues

---

## Next Steps

- [Getting Started](getting-started.md) — Setup and basics
- [Workflows](workflows.md) — When to use scripts in workflows
