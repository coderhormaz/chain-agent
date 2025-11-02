-- Create contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    contact_username VARCHAR(255),
    wallet_address VARCHAR(42) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_user_contact_name UNIQUE(user_id, contact_name),
    CONSTRAINT unique_user_wallet UNIQUE(user_id, wallet_address),
    CONSTRAINT valid_wallet_address CHECK (wallet_address ~* '^0x[a-fA-F0-9]{40}$')
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_name ON public.contacts(user_id, contact_name);
CREATE INDEX IF NOT EXISTS idx_contacts_wallet_address ON public.contacts(wallet_address);

-- Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own contacts
CREATE POLICY "Users can view own contacts"
    ON public.contacts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own contacts
CREATE POLICY "Users can insert own contacts"
    ON public.contacts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own contacts
CREATE POLICY "Users can update own contacts"
    ON public.contacts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own contacts
CREATE POLICY "Users can delete own contacts"
    ON public.contacts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_contacts_updated_at();
