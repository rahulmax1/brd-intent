-- Database Migration
-- Generated from Intent Model

CREATE TABLE guest_registration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Add columns based on entity: Form used by visitors to register for Wi-Fi access.
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE access_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Add columns based on entity: Temporary credentials granting time-limited Wi-Fi access to guests.
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_dashboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Add columns based on entity: Interface for IT admins to manage guest sessions and policies.
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE session_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Add columns based on entity: Records of guest Wi-Fi usage for compliance and monitoring.
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

