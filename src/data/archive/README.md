# Schema Archive

Historical database schemas for VBS Portal project.

## acfs-datamodel-corrected-v0.8.0.dbml

**Created:** 2026-03-24
**Status:** Superseded by acfs-production-schema.dbml on 2026-03-26
**Purpose:** Corrected schema generated from Intent Model v0.8.0

This schema identified and fixed critical gaps from the original VBS_DBML (BA/Miro):
- Added dual-dimension HBL model (milestone + hbl_status)
- Added pickup_site_id, consignee fields
- Added under_bond workflow fields
- Fixed slot cutoff structure (relative day + time)
- Added driver_records table
- Added delegation entity

**Why superseded:**
Merged with VBS_DBML operational enhancements to create production-grade schema with comprehensive documentation, Australian compliance notes, and implementation guidance.

## Schema Evolution Timeline

1. **VBS_DBML (BA/Miro)** - Initial design from business analyst transcript
   - ✅ Good: Companies, GST, operational structure
   - ❌ Missing: BR requirements, dual-dimension HBL, critical fields

2. **acfs-datamodel-corrected-v0.8.0.dbml** (2026-03-24) - Intent Model correction
   - ✅ Fixed: All BR requirements, critical missing fields
   - ⚠️ Minimal: Basic DBML, limited documentation

3. **acfs-production-schema.dbml** (2026-03-26) - Production merge ✅ CURRENT
   - ✅ Complete: All BR requirements + operational excellence
   - ✅ Documented: Comprehensive notes, compliance references
   - ✅ Ready: Implementation guidance, formulas, index strategy
