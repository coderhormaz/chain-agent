-- Certificate Issuers Table
-- Tracks institutions that have requested or been approved as certificate issuers.
-- Approval is manual (admin approves via Supabase dashboard).

CREATE TABLE IF NOT EXISTS certificate_issuers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL CHECK (institution_type IN ('university', 'training', 'professional', 'other')),
  description TEXT,
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE certificate_issuers ENABLE ROW LEVEL SECURITY;

-- Users can read their own issuer record
CREATE POLICY "Users can view own issuer status"
  ON certificate_issuers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own issuer request
CREATE POLICY "Users can request issuer role"
  ON certificate_issuers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own issuer record (e.g. change institution name)
CREATE POLICY "Users can update own issuer record"
  ON certificate_issuers
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_certificate_issuers_user_id ON certificate_issuers(user_id);
CREATE INDEX IF NOT EXISTS idx_certificate_issuers_approved ON certificate_issuers(approved);
