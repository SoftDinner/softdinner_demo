-- Create order_items table
-- This table stores individual items in each order with customizations

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dinner_id UUID NOT NULL REFERENCES dinners(id) ON DELETE RESTRICT,
  style_id UUID NOT NULL REFERENCES styles(id) ON DELETE RESTRICT,
  customizations JSONB,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_dinner_id ON order_items(dinner_id);
CREATE INDEX IF NOT EXISTS idx_order_items_style_id ON order_items(style_id);

