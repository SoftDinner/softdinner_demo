-- Create loyalty_tiers table
-- This table stores loyalty tier definitions (bronze, silver, gold, platinum)

CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL CHECK (name IN ('bronze', 'silver', 'gold', 'platinum')),
  min_orders INTEGER NOT NULL,
  min_spent DECIMAL(10, 2) NOT NULL,
  discount_rate DECIMAL(5, 2) NOT NULL,
  benefits JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at trigger
CREATE TRIGGER update_loyalty_tiers_updated_at
  BEFORE UPDATE ON loyalty_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

