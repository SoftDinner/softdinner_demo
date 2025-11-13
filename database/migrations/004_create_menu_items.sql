-- Create menu_items table
-- This table stores menu items for each dinner
-- Includes customization options and ingredient relationships

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dinner_id UUID NOT NULL REFERENCES dinners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_quantity INTEGER DEFAULT 1,
  unit TEXT NOT NULL,
  base_price DECIMAL(10, 2) DEFAULT 0,
  additional_price DECIMAL(10, 2) NOT NULL,
  is_required BOOLEAN DEFAULT false,
  can_remove BOOLEAN DEFAULT true,
  can_increase BOOLEAN DEFAULT true,
  can_decrease BOOLEAN DEFAULT true,
  max_quantity INTEGER,
  min_quantity INTEGER DEFAULT 1,
  ingredient_id UUID, -- Will be set as FK after ingredients table is created
  ingredient_quantity_per_unit DECIMAL(10, 2) DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_dinner_id ON menu_items(dinner_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_ingredient_id ON menu_items(ingredient_id);

-- Add updated_at trigger
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

