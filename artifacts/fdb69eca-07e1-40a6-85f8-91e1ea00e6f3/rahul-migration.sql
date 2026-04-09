-- Database Migration
-- Generated from Intent Model

CREATE TABLE user_account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Add columns based on entity: Represents a registered user with authentication credentials and profile information
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE project (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Add columns based on entity: A collection of documents and intent models organized under a single project context
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Add columns based on entity: An uploaded file containing requirements, specifications, or other project information
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

