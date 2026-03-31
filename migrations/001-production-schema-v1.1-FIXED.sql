-- =============================================================================
-- ACFS VBS Portal - Production Schema v1.1 FIXED
-- =============================================================================
-- This is a CLEAN schema creation script (not an ALTER migration)
-- Safe to run on empty database - all dummy data will be recreated
-- =============================================================================

-- Drop existing schema if needed (CAUTION: Only safe because no production data)
-- DROP SCHEMA IF EXISTS public CASCADE;
-- CREATE SCHEMA public;

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE company_type AS ENUM (
  'wholesale_freight_forwarder',
  'freight_forwarder',
  'transport_carrier',
  'customer',
  'clearing_agent'
);

CREATE TYPE user_role AS ENUM (
  'acfs_admin',
  'acfs_user',
  'lsp'
);

CREATE TYPE au_state AS ENUM (
  'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'
);

CREATE TYPE slot_day_of_week AS ENUM (
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
);

CREATE TYPE container_status AS ENUM (
  'received', 'unpacking', 'unpacked'
);

CREATE TYPE milestone_status AS ENUM (
  'on_vessel', 'at_wharf', 'in_yard', 'unpacked', 'collected'
);

CREATE TYPE hbl_status AS ENUM (
  'unassigned', 'assigned', 'delegated', 'booked'
);

CREATE TYPE customs_status AS ENUM (
  'pending', 'partial_clearance', 'fully_cleared', 'held'
);

CREATE TYPE release_type AS ENUM (
  'do_required', 'free_release'
);

CREATE TYPE do_validation_status AS ENUM (
  'not_provided', 'uploaded', 'pending_validation', 'validated', 'flagged', 'not_required'
);

CREATE TYPE booking_status AS ENUM (
  'draft', 'booked', 'pending_processing', 'processed', 'collected', 'cancelled'
);

CREATE TYPE payment_gateway AS ENUM (
  'stripe', 'compay'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'completed', 'failed', 'refunded'
);

CREATE TYPE delegation_method AS ENUM (
  'existing_lsp', 'one_off_p4tc'
);

CREATE TYPE delegation_status AS ENUM (
  'active', 'revoked'
);

CREATE TYPE notification_type AS ENUM (
  'do_invalid',
  'booking_confirmation',
  'booking_cancellation',
  'booking_modified',
  'user_invitation',
  'hbl_assignment',
  'user_removal',
  'delegation_notification'
);

CREATE TYPE notification_status AS ENUM (
  'pending', 'sent', 'failed'
);

CREATE TYPE audit_action AS ENUM (
  'created', 'updated', 'deleted'
);

CREATE TYPE entity_type AS ENUM (
  'booking', 'hbl', 'delegation', 'slot', 'user', 'delivery_order'
);

-- =============================================================================
-- TABLES
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Companies & Users
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE companies (
  id              SERIAL PRIMARY KEY,
  company_name    VARCHAR(255) NOT NULL,
  company_type    company_type NOT NULL,
  company_id      VARCHAR(100) UNIQUE,
  branch_code     VARCHAR(50),
  abn             CHAR(11),
  email           VARCHAR(255) NOT NULL UNIQUE,
  state           au_state,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  archived_at     TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_companies_abn_format CHECK (abn IS NULL OR abn ~ '^[0-9]{11}$')
);

CREATE INDEX idx_companies_type_active ON companies(company_type, is_active);
CREATE INDEX idx_companies_abn ON companies(abn);
CREATE INDEX idx_companies_email ON companies(email);

COMMENT ON TABLE companies IS 'All external logistics organisations interacting with VBS';
COMMENT ON COLUMN companies.abn IS 'Australian Business Number - 11 digits for GST invoices';
COMMENT ON COLUMN companies.archived_at IS 'v1.1: Soft-delete timestamp';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER REFERENCES companies(id),
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  role            user_role NOT NULL,
  okta_id         VARCHAR(255) UNIQUE,
  password_hash   VARCHAR(255),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  archived_at     TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_okta_id ON users(okta_id);
CREATE INDEX idx_users_role_active ON users(role, is_active);

COMMENT ON TABLE users IS 'Platform users: ACFS Admin, ACFS User, LSP';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE user_invitations (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  token       VARCHAR(512) NOT NULL UNIQUE,
  sent_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMP NOT NULL,
  used_at     TIMESTAMP
);

CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_user_invitations_user_id ON user_invitations(user_id);
CREATE INDEX idx_user_invitations_expiry ON user_invitations(expires_at, used_at);

COMMENT ON TABLE user_invitations IS 'One-time password-set links (72hr expiry per BR-014)';

-- ─────────────────────────────────────────────────────────────────────────────
-- Sites & Slots
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sites (
  id              SERIAL PRIMARY KEY,
  site_name       VARCHAR(255) NOT NULL UNIQUE,
  branch_code     VARCHAR(50),
  address_line1   VARCHAR(255) NOT NULL,
  address_line2   VARCHAR(255),
  suburb          VARCHAR(100) NOT NULL,
  state           au_state NOT NULL,
  postcode        CHAR(4) NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_sites_postcode_format CHECK (postcode ~ '^[0-9]{4}$')
);

CREATE INDEX idx_sites_state_active ON sites(state, is_active);
CREATE INDEX idx_sites_branch_code ON sites(branch_code);

COMMENT ON TABLE sites IS 'Physical ACFS warehouse locations';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE slots (
  id                              SERIAL PRIMARY KEY,
  site_id                         INTEGER NOT NULL REFERENCES sites(id),
  slot_name                       VARCHAR(255) NOT NULL,
  slot_area                       VARCHAR(100),
  day_of_week                     slot_day_of_week NOT NULL,
  start_time                      TIME NOT NULL,
  end_time                        TIME NOT NULL,

  booking_cutoff_relative_day     VARCHAR(50) NOT NULL,
  booking_cutoff_time             TIME NOT NULL,
  change_cutoff_relative_day      VARCHAR(50) NOT NULL,
  change_cutoff_time              TIME NOT NULL,

  heat_map_threshold              INTEGER,

  is_blocked                      BOOLEAN NOT NULL DEFAULT false,
  is_active                       BOOLEAN NOT NULL DEFAULT true,
  version                         INTEGER NOT NULL DEFAULT 1,

  created_at                      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_slots_time_order CHECK (end_time > start_time)
);

CREATE INDEX idx_slots_site_id ON slots(site_id);
CREATE INDEX idx_slots_schedule ON slots(day_of_week, start_time);
CREATE INDEX idx_slots_is_active ON slots(is_active);

COMMENT ON TABLE slots IS 'Configurable pickup time windows per BR-005';
COMMENT ON COLUMN slots.version IS 'v1.1: Optimistic locking';

-- ─────────────────────────────────────────────────────────────────────────────
-- Containers & HBLs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE containers (
  id                  SERIAL PRIMARY KEY,
  container_number    VARCHAR(50) NOT NULL UNIQUE,
  ocean_bl            VARCHAR(100),
  site_id             INTEGER NOT NULL REFERENCES sites(id),
  status              container_status NOT NULL DEFAULT 'received',
  received_at         TIMESTAMP NOT NULL,
  unpacked_at         TIMESTAMP,
  maximus_reference   VARCHAR(255),
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_containers_number ON containers(container_number);
CREATE INDEX idx_containers_ocean_bl ON containers(ocean_bl);
CREATE INDEX idx_containers_site_status ON containers(site_id, status);

COMMENT ON TABLE containers IS 'Physical shipping containers at ACFS';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE hbls (
  id                      SERIAL PRIMARY KEY,
  container_id            INTEGER NOT NULL REFERENCES containers(id),

  -- Identifiers
  hbl_number              VARCHAR(100) NOT NULL UNIQUE,
  alt_hbl_reference       VARCHAR(100),
  import_ref              VARCHAR(100),

  -- Physical attributes
  description             TEXT,
  weight_kg               DECIMAL(10,3),
  volume_m3               DECIMAL(10,3),
  quantity                INTEGER,
  pack_type               VARCHAR(100),

  -- REMOVED: chargeable_weight (compute on demand)
  -- REMOVED: storage_fee_applicable (compute from last_free_storage_date)

  -- Two orthogonal dimensions (BR-027)
  milestone               milestone_status NOT NULL DEFAULT 'on_vessel',
  hbl_status              hbl_status NOT NULL DEFAULT 'unassigned',

  -- Customs
  customs_status          customs_status NOT NULL DEFAULT 'pending',
  customs_clearance_date  DATE,

  -- Under-bond
  under_bond              BOOLEAN NOT NULL DEFAULT false,
  under_bond_verified     BOOLEAN NOT NULL DEFAULT false,

  -- Release
  release_type            release_type NOT NULL DEFAULT 'do_required',

  -- v1.1: GENERATED COLUMN
  do_waived               BOOLEAN GENERATED ALWAYS AS (release_type = 'free_release' OR under_bond = true) STORED,

  last_free_storage_date  DATE,

  -- Critical for dispatch (BR-031)
  pickup_site_id          INTEGER NOT NULL REFERENCES sites(id),

  -- Consignee (from AGS feed per OQ-034)
  consignee_name          VARCHAR(255),
  consignee_account_code  VARCHAR(100),

  -- Assignment
  assigned_company_id     INTEGER REFERENCES companies(id),

  -- Integration
  maximus_hbl_id          VARCHAR(255),

  -- v1.1: Audit fields
  last_edited_by_user_id  INTEGER REFERENCES users(id),
  version                 INTEGER NOT NULL DEFAULT 1,

  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hbls_number ON hbls(hbl_number);
CREATE INDEX idx_hbls_alt_ref ON hbls(alt_hbl_reference);
CREATE INDEX idx_hbls_container_id ON hbls(container_id);
CREATE INDEX idx_hbls_assigned_company ON hbls(assigned_company_id);
CREATE INDEX idx_hbls_pickup_site ON hbls(pickup_site_id);
CREATE INDEX idx_hbls_dual_dimension ON hbls(milestone, hbl_status);
CREATE INDEX idx_hbls_consignee ON hbls(consignee_account_code);
CREATE INDEX idx_hbls_maximus_id ON hbls(maximus_hbl_id);

COMMENT ON TABLE hbls IS 'House Bill of Lading - core shipment entity';
COMMENT ON COLUMN hbls.do_waived IS 'v1.1: GENERATED - always consistent with release_type and under_bond';
COMMENT ON COLUMN hbls.last_edited_by_user_id IS 'v1.1: For acfs:r12 manual edits';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE hbl_custody_chain (
  id                  SERIAL PRIMARY KEY,
  hbl_id              INTEGER NOT NULL REFERENCES hbls(id),
  from_company_id     INTEGER REFERENCES companies(id),
  to_company_id       INTEGER NOT NULL REFERENCES companies(id),
  hop_sequence        INTEGER NOT NULL,
  delegation_method   delegation_method,
  assigned_at         TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (hbl_id, hop_sequence)
);

CREATE INDEX idx_custody_hbl_id ON hbl_custody_chain(hbl_id);
CREATE INDEX idx_custody_from_company ON hbl_custody_chain(from_company_id);
CREATE INDEX idx_custody_to_company ON hbl_custody_chain(to_company_id);

COMMENT ON TABLE hbl_custody_chain IS 'Each delegation hop - ACFS sees all, LSPs see hop-by-hop (C-009)';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE delegations (
  id                      SERIAL PRIMARY KEY,
  delegator_company_id    INTEGER NOT NULL REFERENCES companies(id),
  delegatee_company_id    INTEGER REFERENCES companies(id),
  delegatee_email         VARCHAR(255),
  delegation_method       delegation_method NOT NULL,
  status                  delegation_status NOT NULL DEFAULT 'active',
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at              TIMESTAMP,
  revoked_by_user_id      INTEGER REFERENCES users(id)
);

CREATE INDEX idx_delegations_delegator ON delegations(delegator_company_id);
CREATE INDEX idx_delegations_delegatee ON delegations(delegatee_company_id);
CREATE INDEX idx_delegations_status ON delegations(status);

COMMENT ON TABLE delegations IS 'First-class delegation entity - allows ACFS revocation per acfs:r13';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE delegation_hbls (
  delegation_id   INTEGER NOT NULL REFERENCES delegations(id),
  hbl_id          INTEGER NOT NULL REFERENCES hbls(id),

  PRIMARY KEY (delegation_id, hbl_id)
);

CREATE INDEX idx_delegation_hbls_hbl_id ON delegation_hbls(hbl_id);

COMMENT ON TABLE delegation_hbls IS 'v1.1: Protected by BR-004 trigger';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE delivery_orders (
  id                      SERIAL PRIMARY KEY,
  hbl_id                  INTEGER NOT NULL REFERENCES hbls(id),
  custody_chain_id        INTEGER REFERENCES hbl_custody_chain(id),

  issued_by_company_id    INTEGER NOT NULL REFERENCES companies(id),
  issued_to_company_id    INTEGER NOT NULL REFERENCES companies(id),

  do_number               VARCHAR(100),
  document_url            TEXT,
  tier_level              INTEGER,

  validation_status       do_validation_status NOT NULL DEFAULT 'not_provided',

  uploaded_by_user_id     INTEGER REFERENCES users(id),
  validated_by_user_id    INTEGER REFERENCES users(id),
  validated_at            TIMESTAMP,
  invalidation_reason     TEXT,

  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dos_hbl_id ON delivery_orders(hbl_id);
CREATE INDEX idx_dos_hbl_tier ON delivery_orders(hbl_id, tier_level);
CREATE INDEX idx_dos_custody_chain ON delivery_orders(custody_chain_id);
CREATE INDEX idx_dos_validation_status ON delivery_orders(validation_status);
CREATE INDEX idx_dos_issued_to ON delivery_orders(issued_to_company_id);

COMMENT ON TABLE delivery_orders IS 'Release authority - one per tier per BR-002';
COMMENT ON COLUMN delivery_orders.uploaded_by_user_id IS 'v1.1: Who uploaded DO';

-- ─────────────────────────────────────────────────────────────────────────────
-- Bookings & Payments
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE bookings (
  id                          SERIAL PRIMARY KEY,
  booking_reference           VARCHAR(50) NOT NULL UNIQUE,

  -- Slot
  slot_id                     INTEGER NOT NULL REFERENCES slots(id),
  slot_date                   DATE NOT NULL,

  -- Booking party
  booked_by_company_id        INTEGER NOT NULL REFERENCES companies(id),
  booked_by_user_id           INTEGER REFERENCES users(id),
  booked_by_email             VARCHAR(255),

  status                      booking_status NOT NULL DEFAULT 'draft',

  -- Driver & vehicle (CoR)
  driver_name                 VARCHAR(255) NOT NULL,
  driver_licence_number       VARCHAR(50) NOT NULL,
  driver_phone                VARCHAR(20),
  truck_rego                  VARCHAR(20) NOT NULL,
  truck_details               TEXT,

  -- Site induction (BR-017)
  site_induction_completed    BOOLEAN NOT NULL DEFAULT false,
  site_induction_skipped      BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_at           TIMESTAMP,

  -- Fees (GST Act 1999)
  total_fee_excl_gst          DECIMAL(10,2) NOT NULL,
  gst_amount                  DECIMAL(10,2) NOT NULL,
  total_fee_incl_gst          DECIMAL(10,2) NOT NULL,

  -- Modifications (BR-015)
  is_late_change              BOOLEAN NOT NULL DEFAULT false,
  late_change_fee             DECIMAL(10,2) NOT NULL DEFAULT 0,
  last_modified_at            TIMESTAMP,
  last_modified_by_user_id    INTEGER REFERENCES users(id),

  -- v1.1: Cutoff override tracking
  cutoff_override_by_user_id  INTEGER REFERENCES users(id),
  cutoff_override_reason      TEXT,
  cutoff_override_at          TIMESTAMP,

  -- Administrative
  notes                       TEXT,
  cancelled_at                TIMESTAMP,
  cancelled_by_user_id        INTEGER REFERENCES users(id),
  cancellation_reason         TEXT,
  processed_at                TIMESTAMP,
  processed_by_user_id        INTEGER REFERENCES users(id),

  version                     INTEGER NOT NULL DEFAULT 1,

  created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),

  -- v1.1: GST validation
  CONSTRAINT chk_bookings_gst_calculation CHECK (
    ABS(gst_amount - (total_fee_excl_gst * 0.10)) < 0.01
    AND ABS(total_fee_incl_gst - (total_fee_excl_gst + gst_amount)) < 0.01
  ),

  CONSTRAINT chk_bookings_fees_non_negative CHECK (
    total_fee_excl_gst >= 0 AND gst_amount >= 0
    AND total_fee_incl_gst >= 0 AND late_change_fee >= 0
  )
);

CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_bookings_slot ON bookings(slot_id, slot_date);
CREATE INDEX idx_bookings_company_id ON bookings(booked_by_company_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_truck_rego ON bookings(truck_rego);
CREATE INDEX idx_bookings_driver_licence ON bookings(driver_licence_number);

COMMENT ON TABLE bookings IS 'Pickup booking - status "collected" derived per BR-028';
COMMENT ON COLUMN bookings.cutoff_override_reason IS 'v1.1: BR-015 admin override audit';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE booking_hbls (
  id                  SERIAL PRIMARY KEY,
  booking_id          INTEGER NOT NULL REFERENCES bookings(id),
  hbl_id              INTEGER NOT NULL REFERENCES hbls(id),

  -- Snapshot at booking time (BR-019)
  chargeable_weight   DECIMAL(10,3) NOT NULL,
  rate                DECIMAL(10,4) NOT NULL,
  per_hbl_fee         DECIMAL(10,2) NOT NULL,

  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (booking_id, hbl_id),

  -- v1.1: Fee calculation validation
  CONSTRAINT chk_booking_hbls_fee_calculation CHECK (
    ABS(per_hbl_fee - (chargeable_weight * rate)) < 0.01
  )
);

CREATE INDEX idx_booking_hbls_booking_id ON booking_hbls(booking_id);
CREATE INDEX idx_booking_hbls_hbl_id ON booking_hbls(hbl_id);

COMMENT ON TABLE booking_hbls IS 'v1.1: Protected by BR-004 trigger';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE payments (
  id                      SERIAL PRIMARY KEY,
  booking_id              INTEGER NOT NULL REFERENCES bookings(id),

  amount_excl_gst         DECIMAL(10,2) NOT NULL,
  gst_amount              DECIMAL(10,2) NOT NULL,
  total_amount            DECIMAL(10,2) NOT NULL,

  payment_gateway         payment_gateway,
  payment_gateway_ref     VARCHAR(255),
  transaction_reference   VARCHAR(255),

  status                  payment_status NOT NULL DEFAULT 'pending',
  payment_timestamp       TIMESTAMP,
  processed_at            TIMESTAMP,

  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),

  -- v1.1: GST validation
  CONSTRAINT chk_payments_gst_calculation CHECK (
    ABS(gst_amount - (amount_excl_gst * 0.10)) < 0.01
    AND ABS(total_amount - (amount_excl_gst + gst_amount)) < 0.01
  )
);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_gateway_ref ON payments(payment_gateway_ref);
CREATE INDEX idx_payments_status ON payments(status);

COMMENT ON TABLE payments IS 'v1.1: payment_gateway now enum';

-- ─────────────────────────────────────────────────────────────────────────────
-- Pricing
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE pricing_zones (
  id              SERIAL PRIMARY KEY,
  site_id         INTEGER NOT NULL REFERENCES sites(id),
  zone_name       VARCHAR(100),

  rate_per_kg     DECIMAL(10,4) NOT NULL,
  minimum_charge  DECIMAL(10,2) NOT NULL,
  gst_rate        DECIMAL(5,4) NOT NULL DEFAULT 0.1000,

  effective_from  DATE NOT NULL,
  effective_to    DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,

  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_pricing_gst_rate_valid CHECK (gst_rate >= 0 AND gst_rate <= 1)
);

CREATE INDEX idx_pricing_site_id ON pricing_zones(site_id);
CREATE INDEX idx_pricing_temporal ON pricing_zones(site_id, effective_from, effective_to);
CREATE INDEX idx_pricing_is_active ON pricing_zones(is_active);

COMMENT ON TABLE pricing_zones IS 'Rate configuration - temporal validity tracking';

-- ─────────────────────────────────────────────────────────────────────────────
-- Driver Records
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE driver_records (
  id                          SERIAL PRIMARY KEY,
  company_id                  INTEGER NOT NULL REFERENCES companies(id),

  driver_name                 VARCHAR(255) NOT NULL,
  driver_licence_number       VARCHAR(50) NOT NULL,
  driver_phone                VARCHAR(20),
  default_truck_rego          VARCHAR(20),

  site_induction_completed    BOOLEAN NOT NULL DEFAULT false,
  site_induction_date         DATE,

  is_active                   BOOLEAN NOT NULL DEFAULT true,
  archived_at                 TIMESTAMP,

  created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (company_id, driver_licence_number)
);

CREATE INDEX idx_driver_records_company_id ON driver_records(company_id);
CREATE INDEX idx_driver_records_is_active ON driver_records(is_active);

COMMENT ON TABLE driver_records IS 'Scoped per company (BR-016)';
COMMENT ON COLUMN driver_records.archived_at IS 'v1.1: Soft-delete consistency';

-- ─────────────────────────────────────────────────────────────────────────────
-- Notifications
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE email_notifications (
  id                    SERIAL PRIMARY KEY,

  recipient_email       VARCHAR(255) NOT NULL,
  recipient_user_id     INTEGER REFERENCES users(id),
  recipient_company_id  INTEGER REFERENCES companies(id),

  notification_type     notification_type NOT NULL,
  related_entity_type   entity_type,
  related_entity_id     INTEGER,

  subject               VARCHAR(500),
  body                  TEXT,
  secure_link_token     VARCHAR(512),
  otp_code              VARCHAR(10),

  sent_at               TIMESTAMP,
  status                notification_status NOT NULL DEFAULT 'pending',
  error_message         TEXT,

  -- v1.1: Retry mechanism
  retry_count           INTEGER NOT NULL DEFAULT 0,
  next_retry_at         TIMESTAMP,
  max_retries           INTEGER NOT NULL DEFAULT 3,

  created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient_email ON email_notifications(recipient_email);
CREATE INDEX idx_notifications_recipient_user_id ON email_notifications(recipient_user_id);
CREATE INDEX idx_notifications_type_status ON email_notifications(notification_type, status);
CREATE INDEX idx_notifications_entity ON email_notifications(related_entity_type, related_entity_id);
CREATE INDEX idx_notifications_retry ON email_notifications(next_retry_at);

COMMENT ON TABLE email_notifications IS 'v1.1: Added retry mechanism';

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit Trail (NEW in v1.1)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE entity_audit_log (
  id                  SERIAL PRIMARY KEY,
  entity_type         entity_type NOT NULL,
  entity_id           INTEGER NOT NULL,
  action              audit_action NOT NULL,
  changed_fields      JSONB,
  changed_by_user_id  INTEGER NOT NULL REFERENCES users(id),
  changed_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON entity_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON entity_audit_log(changed_by_user_id);
CREATE INDEX idx_audit_timestamp ON entity_audit_log(changed_at);
CREATE INDEX idx_audit_entity_timeline ON entity_audit_log(entity_type, entity_id, changed_at);

COMMENT ON TABLE entity_audit_log IS 'v1.1: NEW - Comprehensive audit trail';

-- =============================================================================
-- TRIGGERS & FUNCTIONS
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- BR-004 Enforcement: Delegate XOR Book
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_hbl_booking_rules()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent booking delegated HBL
  IF TG_TABLE_NAME = 'booking_hbls' THEN
    IF EXISTS (
      SELECT 1 FROM hbls
      WHERE id = NEW.hbl_id AND hbl_status = 'delegated'
    ) THEN
      RAISE EXCEPTION 'BR-004: Cannot book delegated HBL (hbl_id=%)', NEW.hbl_id;
    END IF;
  END IF;

  -- Prevent delegating booked HBL
  IF TG_TABLE_NAME = 'delegation_hbls' THEN
    IF EXISTS (
      SELECT 1 FROM hbls
      WHERE id = NEW.hbl_id AND hbl_status = 'booked'
    ) THEN
      RAISE EXCEPTION 'BR-004: Cannot delegate booked HBL (hbl_id=%)', NEW.hbl_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_hbls_br004
  BEFORE INSERT ON booking_hbls
  FOR EACH ROW
  EXECUTE FUNCTION check_hbl_booking_rules();

CREATE TRIGGER trg_delegation_hbls_br004
  BEFORE INSERT ON delegation_hbls
  FOR EACH ROW
  EXECUTE FUNCTION check_hbl_booking_rules();

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-update updated_at timestamps
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_slots_updated_at BEFORE UPDATE ON slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_containers_updated_at BEFORE UPDATE ON containers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_hbls_updated_at BEFORE UPDATE ON hbls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_delivery_orders_updated_at BEFORE UPDATE ON delivery_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_pricing_zones_updated_at BEFORE UPDATE ON pricing_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_driver_records_updated_at BEFORE UPDATE ON driver_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- END
-- =============================================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ ACFS VBS Portal Schema v1.1 FIXED created successfully';
  RAISE NOTICE '   - All critical fixes applied';
  RAISE NOTICE '   - BR-004 trigger active';
  RAISE NOTICE '   - GST constraints enforced';
  RAISE NOTICE '   - Generated columns created';
  RAISE NOTICE '   - Audit trail ready';
END $$;
