-- Create dinners table
-- This table stores dinner menu items (Valentine, French, English, Champagne Feast)

CREATE TABLE IF NOT EXISTS dinners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  available_styles TEXT[] DEFAULT ARRAY['simple', 'grand', 'deluxe']::TEXT[],
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_dinners_name ON dinners(name);

-- Add updated_at trigger
CREATE TRIGGER update_dinners_updated_at
  BEFORE UPDATE ON dinners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

