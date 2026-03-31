import type { ProjectRequirements, Assumption, Dependency, NonFunctionalRequirement } from './types'

// Extracted from VBS_Pickup_BRD(Final)_V1.5.pdf
// Section 7.1: Assumptions
// Section 7.3: Dependencies and Ownership
// Section 8: High-Level Non-Functional Expectations

const assumptions: Assumption[] = [
  // User Roles and Access
  {
    id: 'A-001',
    category: 'User Roles and Access',
    assumption: 'A single, generic LSP role is used to represent wholesale freight forwarders, freight forwarders, and transport carriers.',
    rationale: 'Simplifies Phase 1 implementation; specific sub-roles can be added later if needed'
  },
  {
    id: 'A-002',
    category: 'User Roles and Access',
    assumption: 'LSP access is at company account level, not individual named users. One login per company; internal distribution and control of access are managed by the company itself.',
    rationale: 'Phase 1 focuses on company-level access; user management within LSP accounts is delegated'
  },
  {
    id: 'A-003',
    category: 'User Roles and Access',
    assumption: 'Supported user types are: LSP, ACFS Admin, and ACFS User. One ACFS Admin will act as a "Super User" at launch with authority to create subsequent users.',
    rationale: 'Bootstrap initial system access; Super User can create other admin and user accounts'
  },

  // Onboarding and Authentication
  {
    id: 'A-004',
    category: 'Onboarding and Authentication',
    assumption: 'There is no self-registration for Day 1. LSP and ACFS user accounts are created by ACFS Admin.',
    rationale: 'Controlled onboarding; prevents unauthorized access during initial rollout'
  },
  {
    id: 'A-005',
    category: 'Onboarding and Authentication',
    assumption: 'Welcome or activation links for LSP accounts expire after 72 hours; reactivation after expiry requires ACFS support.',
    rationale: 'Security measure; limits exposure window for activation links'
  },
  {
    id: 'A-006',
    category: 'Onboarding and Authentication',
    assumption: 'ACFS internal users authenticate via the existing ACFS SSO identity platform.',
    rationale: 'Leverages existing enterprise authentication; no duplicate credential management'
  },

  // Booking Eligibility and Readiness
  {
    id: 'A-007',
    category: 'Booking Eligibility and Readiness',
    assumption: 'A booking can only be submitted when, for all included HBLs: The shipment milestone is Unpacked, The shipment is fully customs cleared, and All required DOs are uploaded and validated or marked as free release.',
    rationale: 'Enforces operational readiness; prevents premature booking attempts'
  },
  {
    id: 'A-008',
    category: 'Booking Eligibility and Readiness',
    assumption: 'Missing or invalid DOs are resolved by upload or re-upload; a new booking is not required solely due to DO issues.',
    rationale: 'Allows in-place resolution without canceling and recreating entire booking'
  },

  // Shipment and HBL Visibility
  {
    id: 'A-009',
    category: 'Shipment and HBL Visibility',
    assumption: 'HBL-to-primary-hop mapping and detailed customs status are available in Maximas and will be provided to VBS as ready-to-consume fields.',
    rationale: 'Maximas is system of record; VBS consumes rather than derives this data'
  },
  {
    id: 'A-010',
    category: 'Shipment and HBL Visibility',
    assumption: 'Only the "next-hop" party name for an HBL is displayed at a time.',
    rationale: 'Hop-by-hop visibility model; commercial sensitivity and liability boundaries (C-009)'
  },

  // One-off Bookings
  {
    id: 'A-011',
    category: 'One-off Bookings',
    assumption: 'One-off bookings, where only an email address is required and no account is created, are recognised but will not be implemented in Phase 1 and will be considered for a fast follow.',
    rationale: 'Deferred to reduce Phase 1 scope; P4TC functionality acknowledged but not built yet'
  },

  // Fees and Charges
  {
    id: 'A-012',
    category: 'Fees and Charges',
    assumption: 'Storage fee payment and storage fee calculation are outside the scope of VBS.',
    rationale: 'Separate billing system handles storage fees; VBS only shows indicator flag'
  },
  {
    id: 'A-013',
    category: 'Fees and Charges',
    assumption: 'A storage fee indicator flag will be available based on LFD; it indicates potential outstanding fees but does not drive calculation.',
    rationale: 'Informational only; actual fee calculation happens in separate finance system'
  },
  {
    id: 'A-014',
    category: 'Fees and Charges',
    assumption: 'A minimum charge applies per booking, not per HBL.',
    rationale: 'Ensures minimum revenue per transaction regardless of HBL count'
  },
  {
    id: 'A-015',
    category: 'Fees and Charges',
    assumption: 'A chargeable weight field is used to calculate individual HBL fees.',
    rationale: 'chargeable_weight = MAX(weight_kg, volume_m3); industry-standard volumetric pricing'
  },
  {
    id: 'A-016',
    category: 'Fees and Charges',
    assumption: 'Total booking fees equal the sum of all HBL fees plus the minimum booking charge.',
    rationale: 'Transparent fee breakdown; sum of per-HBL charges plus fixed minimum'
  },
  {
    id: 'A-017',
    category: 'Fees and Charges',
    assumption: 'Total load is calculated using the total weight and volume across all HBLs.',
    rationale: 'Informational for LSP dispatch planning; not used for fee calculation'
  },

  // Slot Booking and Configuration
  {
    id: 'A-018',
    category: 'Slot Booking and Configuration',
    assumption: 'Each booking supports a single slot selection.',
    rationale: 'Phase 1 simplification; multiple slots per booking deferred'
  },
  {
    id: 'A-019',
    category: 'Slot Booking and Configuration',
    assumption: 'No Day 1 restrictions are enforced on load or truck type.',
    rationale: 'LSP responsible for truck capacity matching; no slot capacity limits enforced'
  },
  {
    id: 'A-020',
    category: 'Slot Booking and Configuration',
    assumption: 'Site data will be uploaded once directly into the backend; no site configuration module is required for Phase 1.',
    rationale: 'Static data; DB-seeded approach sufficient for Phase 1 (C-006)'
  },
  {
    id: 'A-021',
    category: 'Slot Booking and Configuration',
    assumption: 'Heatmap indicators are informational only and do not prevent bookings.',
    rationale: 'Visual guidance for slot selection; no hard capacity enforcement'
  },

  // Driver and Truck Management
  {
    id: 'A-022',
    category: 'Driver and Truck Management',
    assumption: 'Driver details are captured and can be reused under the same LSP company account, subject to design.',
    rationale: 'Convenience for repeat bookings; driver records scoped per LSP account (BR-016)'
  },
  {
    id: 'A-023',
    category: 'Driver and Truck Management',
    assumption: 'Driver data is not shared across LSPs.',
    rationale: 'Privacy and commercial sensitivity; each LSP maintains own driver roster'
  },
  {
    id: 'A-024',
    category: 'Driver and Truck Management',
    assumption: 'Drivers do not receive system-generated emails; booking references and instructions are provided offline by the LSP.',
    rationale: 'Driver is not a portal user; booking party manages driver communication (BR-012)'
  },
  {
    id: 'A-025',
    category: 'Driver and Truck Management',
    assumption: 'Previously entered driver and truck data will not be maintained for Phase 1. This will be introduced in the fast follow/next phase.',
    rationale: 'Deferred feature; Phase 1 treats driver/truck as booking attributes only'
  },

  // Booking Modifications and Cancellations
  {
    id: 'A-026',
    category: 'Booking Modifications and Cancellations',
    assumption: 'Before the change cut-off, LSPs may update driver details, truck details, and slot selection (subject to new slot availability).',
    rationale: 'Flexibility for operational changes before cutoff deadline (BR-015)'
  },
  {
    id: 'A-027',
    category: 'Booking Modifications and Cancellations',
    assumption: 'After the change cut-off and until all HBLs in the booking are collected, LSPs may only update driver and truck details.',
    rationale: 'Limited changes after cutoff; slot/HBL changes locked to prevent operational disruption (BR-015)'
  },
  {
    id: 'A-028',
    category: 'Booking Modifications and Cancellations',
    assumption: 'Slot selection and any fee-impacting attributes are locked after change cut-off.',
    rationale: 'Protects ACFS operational planning; fee stability after cutoff'
  },
  {
    id: 'A-029',
    category: 'Booking Modifications and Cancellations',
    assumption: 'Fee-impacting changes are not supported via the LSP interface in Phase 1 and require ACFS Admin intervention.',
    rationale: 'Controlled process for changes affecting fees; ACFS oversight required'
  },
  {
    id: 'A-030',
    category: 'Booking Modifications and Cancellations',
    assumption: 'ACFS Admin can make such changes on the LSP\'s behalf in the backend.',
    rationale: 'Admin override capability; handles exceptional cases (BR-015)'
  },
  {
    id: 'A-031',
    category: 'Booking Modifications and Cancellations',
    assumption: 'Booking cancellations by LSPs are permitted, and upon cancellation, HBLs in that booking shall become available for rebooking; financial refunds or adjustments will be handled outside VBS.',
    rationale: 'VBS tracks cancellation status; finance system handles refund processing (BR-022)'
  },

  // Delivery Order Validation
  {
    id: 'A-032',
    category: 'Delivery Order Validation',
    assumption: 'DO validation is a manual administrative process performed by ACFS.',
    rationale: 'Complex validation rules requiring human judgment; not automatable in Phase 1'
  },
  {
    id: 'A-033',
    category: 'Delivery Order Validation',
    assumption: 'Invalid DOs must be corrected and re-uploaded before processing continues.',
    rationale: 'Hard gate for pickup authorization; compliance requirement'
  },
  {
    id: 'A-034',
    category: 'Delivery Order Validation',
    assumption: 'Validation criteria and decisions are governed by ACFS Operations and Compliance.',
    rationale: 'Business rules owned by operations team; VBS records validation results'
  },
  {
    id: 'A-035',
    category: 'Delivery Order Validation',
    assumption: 'Once all HBLs in a booking are reviewed and conditions are met, bookings are marked processed, and shipment statuses update from Maximas on the next sync cycle.',
    rationale: 'Maximas remains system of record for milestone updates; VBS reflects state'
  },
]

const dependencies: Dependency[] = [
  {
    id: 'DEP-001',
    name: 'Identity and SSO',
    description: 'Integration with ACFS SSO platform for internal user authentication.',
    owner: 'ACFS IT / Security',
    status: 'pending',
    risk: 'medium'
  },
  {
    id: 'DEP-002',
    name: 'Maximas Data Feed',
    description: 'Reliable provision of HBL data, milestones (e.g. Unpacked, Collected), customs status, and any required storage-related indicators to VBS.',
    owner: 'ACFS IT / Maximas Product Owner',
    status: 'pending',
    risk: 'high'
  },
  {
    id: 'DEP-003',
    name: 'Payment Gateway',
    description: 'Selection, configuration, and commercial enablement of Stripe or an alternative gateway (e.g. Compay). Final selection to be confirmed by ACFS.',
    owner: 'ACFS Finance / IT',
    status: 'pending',
    risk: 'medium'
  },
  {
    id: 'DEP-004',
    name: 'Charging Configuration',
    description: 'Definition and maintenance of pricing parameters (minimum booking charge, rates, and chargeable weight rules).',
    owner: 'ACFS Finance / Product',
    status: 'pending',
    risk: 'low'
  },
  {
    id: 'DEP-005',
    name: 'Communication Content',
    description: 'Provision of email templates and message copy for: Delegation notifications, Booking confirmations, DO invalid notifications, User activation/onboarding.',
    owner: 'ACFS Operations / Legal / Marketing (as applicable)',
    status: 'pending',
    risk: 'low'
  },
  {
    id: 'DEP-006',
    name: 'Slot and Site Configuration',
    description: 'Initial and ongoing slot and site configuration in backend.',
    owner: 'ACFS IT / Operations',
    status: 'pending',
    risk: 'low'
  },
  {
    id: 'DEP-007',
    name: 'DO Validation Rules',
    description: 'Business rules and criteria for what constitutes a valid DO and how non-compliance is treated.',
    owner: 'ACFS Operations / Compliance',
    status: 'pending',
    risk: 'medium'
  },
]

const nfrs: NonFunctionalRequirement[] = [
  // Performance
  {
    id: 'NFR-001',
    category: 'performance',
    requirement: 'The system should provide responsive HBL list and search operations suitable for day-to-day operational use.',
    measurement: 'User-perceived responsiveness; no hard target for Phase 1',
    target: 'Acceptable for operational use (< 3 seconds for typical queries)'
  },
  {
    id: 'NFR-002',
    category: 'performance',
    requirement: 'Slot availability views and booking submission should complete within acceptable operational timeframes.',
    measurement: 'End-to-end booking submission time',
    target: 'Acceptable for operational use (< 5 seconds for booking confirmation)'
  },

  // Availability
  {
    id: 'NFR-003',
    category: 'availability',
    requirement: 'The system should be available during ACFS-defined business operating hours for LSP and ACFS users, with specific targets defined in technical and support SLAs.',
    measurement: 'Uptime percentage during business hours',
    target: 'SLA-defined (typically 99%+ during business hours)'
  },

  // Audit and Logging
  {
    id: 'NFR-004',
    category: 'audit',
    requirement: 'Key actions must be auditable, including: Delegation of HBLs, Creation and modification of bookings, DO validation decisions, User creation and role changes.',
    measurement: 'Audit log completeness and retention',
    target: 'All listed actions logged with actor, timestamp, and key data changes'
  },
  {
    id: 'NFR-005',
    category: 'audit',
    requirement: 'Audit logs should capture actor, timestamp, and key data changes to support compliance and operational investigations.',
    measurement: 'Audit log detail and searchability',
    target: 'Sufficient detail for compliance audit and issue investigation'
  },

  // Security
  {
    id: 'NFR-006',
    category: 'security',
    requirement: 'Access control must enforce role-based permissions for LSP, ACFS Admin, and ACFS User roles.',
    measurement: 'Role-based access control (RBAC) enforcement',
    target: '100% of operations gated by role permissions'
  },
  {
    id: 'NFR-007',
    category: 'security',
    requirement: 'Data exchange with Maximas and the payment gateway must follow ACFS security guidelines and integration standards.',
    measurement: 'Security compliance assessment',
    target: 'Passes ACFS security review for data exchange'
  },
]

export const projectRequirements: ProjectRequirements = {
  assumptions,
  dependencies,
  nfrs,
}
