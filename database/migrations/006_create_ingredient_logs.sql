-- Create ingredient_logs table
-- This table tracks all ingredient inventory changes (in/out)

CREATE TABLE IF NOT EXISTS ingredient_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('in', 'out')),
  quantity DECIMAL(10, 2) NOT NULL,
  previous_quantity DECIMAL(10, 2) NOT NULL,
  new_quantity DECIMAL(10, 2) NOT NULL,
  staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id UUID, -- Will be set as FK after orders table is created
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ingredient_logs_ingredient_id ON ingredient_logs(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_logs_created_at ON ingredient_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ingredient_logs_staff_id ON ingredient_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_logs_order_id ON ingredient_logs(order_id);

