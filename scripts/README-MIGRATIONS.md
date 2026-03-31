# Scripts Directory

This directory contains automation scripts for the VBS Intent Model project.

## Available Scripts

### Model Sync Validation (`validate-model-sync.ts`)

Validates schema consistency across the intent model codebase.

```bash
pnpm validate:model
```

See [Model Sync Validation](../docs/model-sync-validation.md) for full documentation.

### Database Migration Generator (`generate-migration.ts`)

Automatically generates PostgreSQL migration files by comparing the intent model with the existing database schema.

## Usage

```bash
pnpm run generate:migration
```

## What It Does

The script:

1. Parses all entities in `/src/domain/intent-model/model.ts`
2. Reads the existing database schema from `/migrations/001-production-schema-v1.1-FIXED.sql`
3. Detects differences:
   - New entities (generates `CREATE TABLE` statements)
   - New fields on existing entities (generates `ALTER TABLE ADD COLUMN`)
   - Changed field types (generates `ALTER TABLE ALTER COLUMN`)
   - Removed entities (warns user, does NOT auto-generate `DROP TABLE`)
4. Generates a timestamped migration file in `/migrations/` with:
   - UP migration (apply changes)
   - DOWN migration (rollback changes)

## Type Mapping

The script maps intent model field types to PostgreSQL types:

| Intent Model Type | PostgreSQL Type |
|-------------------|-----------------|
| `string` | `TEXT` |
| `number` | `DECIMAL(10,2)` |
| `boolean` | `BOOLEAN` |
| `date` | `DATE` |
| `time` | `TIME` |
| `timestamp` | `TIMESTAMP` |
| `'value1' \| 'value2'` | Custom ENUM type |
| `string[]` | `TEXT[]` |
| `number[]` | `INTEGER[]` |
| Complex objects | `JSONB` |

## Entity to Table Mapping

Entity IDs are converted to snake_case plural table names:

- `hbl` → `hbls`
- `booking` → `bookings`
- `delivery_order` → `delivery_orders`
- `booking_hbl_link` → `booking_hbls`

## Field to Column Mapping

Field names are converted from camelCase to snake_case:

- `hblNumber` → `hbl_number`
- `pickupSite` → `pickup_site`
- `doWaived` → `do_waived`

## Example Output

```sql
-- =============================================================================
-- Migration: Sync with intent model v0.9.0
-- Generated: 2026-03-28
-- =============================================================================

-- UP Migration
-- Apply changes to bring database in sync with intent model

-- Add column: hbls.pickup_site
ALTER TABLE hbls ADD COLUMN pickup_site TEXT;

-- Add column: bookings.booking_party
ALTER TABLE bookings ADD COLUMN booking_party TEXT;

-- =============================================================================

-- DOWN Migration
-- Rollback changes

-- Drop column: bookings.booking_party
ALTER TABLE bookings DROP COLUMN booking_party;

-- Drop column: hbls.pickup_site
ALTER TABLE hbls DROP COLUMN pickup_site;
```

## Safety Features

1. **Manual Review Required**: The script generates migration files but does NOT automatically apply them
2. **No Auto-Drop**: If a table exists in the database but not in the intent model, the script warns you but does NOT generate a `DROP TABLE` statement
3. **Rollback Support**: Every UP migration has a corresponding DOWN migration
4. **Skips Integration Entities**: Entities marked with `is_integration: true` are skipped
5. **Skips Deferred Entities**: Entities marked with `deferred: true` are skipped

## Applying Migrations

After reviewing the generated migration file:

```bash
# Local database
psql -U your_user -d vbs_portal -f migrations/002-model-sync-2026-03-28.sql

# Production (use with extreme caution)
psql postgresql://user:pass@host:5432/database -f migrations/002-model-sync-2026-03-28.sql
```

## Rolling Back Migrations

To rollback a migration, extract the DOWN section from the migration file and run it:

```bash
psql -U your_user -d vbs_portal -f migrations/002-model-sync-2026-03-28-rollback.sql
```

## Limitations

1. **Type Detection**: Type comparison is simplified - it may flag some false positives for complex types
2. **Foreign Keys**: Foreign key relationships are not automatically detected or generated
3. **Indexes**: New indexes are not generated - add them manually if needed
4. **Constraints**: CHECK constraints, UNIQUE constraints, etc. are not generated
5. **Enum Changes**: Modifying existing enum types requires manual migration
6. **Data Migration**: The script only handles schema changes - data migrations must be written manually

## Advanced Usage

### Customizing Type Mapping

Edit `mapFieldTypeToPostgres()` in `scripts/generate-migration.ts`:

```typescript
function mapFieldTypeToPostgres(fieldType: string): string {
  const typeMap: Record<string, string> = {
    string: 'TEXT',
    number: 'DECIMAL(10,2)',
    // Add your custom mappings here
  }
  return typeMap[fieldType] || 'TEXT'
}
```

### Customizing Table Name Mapping

Edit `entityIdToTableName()` in `scripts/generate-migration.ts`:

```typescript
function entityIdToTableName(entityId: string): string {
  const tableNameMap: Record<string, string> = {
    hbl: 'hbls',
    booking: 'bookings',
    // Add your custom mappings here
  }
  return tableNameMap[entityId] || `${entityId}s`
}
```

## Troubleshooting

### "No changes detected" but I added a new entity

- Check if the entity is marked as `is_integration: true` or `deferred: true`
- Verify the entity exists in `/src/domain/intent-model/model.ts` in the `entities` array

### Migration generates too many changes

- The script compares against the latest schema file - make sure it's up to date
- Some changes may be false positives due to type mapping differences
- Review and manually edit the generated migration before applying

### Type mismatch warnings

- The script uses simple type comparison - `VARCHAR(100)` vs `TEXT` may be flagged as different
- Review each type change - some may be safe to ignore or consolidate

## Best Practices

1. **Run Before Schema Changes**: Generate a migration before manually editing the database
2. **Review Every Migration**: Never blindly apply generated migrations
3. **Test Locally First**: Always test migrations on a local database before production
4. **Version Control**: Commit migration files to git
5. **Sequential Numbering**: Keep migration numbers sequential (001, 002, 003...)
6. **Document Manual Changes**: If you manually edit a migration, add a comment explaining why
