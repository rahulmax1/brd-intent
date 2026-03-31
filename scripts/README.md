# Scripts

## generate-ai-types.ts

Automatically generates AI system prompt type definitions from TypeScript source types.

### Usage

```bash
pnpm generate:ai-types
```

### What it does

1. Parses `/src/domain/intent-model/types.ts` and extracts core type definitions
2. Converts TypeScript types to a simplified string format that AI can understand
3. Inlines nested types (Responsibility, Field, Transition, etc.) for readability
4. Adds helpful comments about ID patterns from project config
5. Generates `/src/lib/ai-type-definitions.ts` which exports a `generateTypeDefinitions()` function

### When to run

Run this script whenever you modify types in `/src/domain/intent-model/types.ts`. The generated function is imported by `/src/lib/ai-prompt.ts` to provide accurate type context to the OpenAI API.

### Benefits

- Single source of truth for types
- No manual synchronization required
- Type safety through automation
- Always accurate AI prompts

---

## generate-zod-schemas.ts

Automatically generates Zod schemas from TypeScript types defined in `/src/domain/intent-model/types.ts`.

### Usage

```bash
pnpm generate:schemas
```

### What it does

1. Parses all exported type definitions from `types.ts`
2. Generates corresponding Zod schemas with proper validation
3. Handles:
   - Primitive types (string, number, boolean)
   - Arrays
   - Optional fields
   - Enum/union types
   - Nested object literals
   - Type references
4. Sorts schemas by dependency order (referenced types come first)
5. Outputs to `/src/lib/model-schemas.ts` with auto-generated header

### When to run

Run this script whenever you modify type definitions in `types.ts`. The script ensures schemas stay in sync with types automatically.

### Features

- Handles complex nested structures (e.g., Entity lifecycle objects)
- Detects dependencies in nested object literals
- Preserves enum values from union types
- Generates section-level schemas for scoped edits
- Adds helpful header comments to generated file
