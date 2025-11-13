-- Create styles table
-- This table stores serving styles (simple, grand, deluxe)
-- Note: Champagne Feast is only available in Grand/Deluxe styles

CREATE TABLE IF NOT EXISTS styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL CHECK (name IN ('simple', 'grand', 'deluxe')),
  price_modifier DECIMAL(10, 2) NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at trigger
CREATE TRIGGER update_styles_updated_at
  BEFORE UPDATE ON styles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

