-- Create loyalty_history table
-- This table tracks loyalty tier changes and discount applications

CREATE TABLE IF NOT EXISTS loyalty_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('tier_upgrade', 'tier_downgrade', 'discount_applied')),
  previous_tier TEXT,
  new_tier TEXT,
  discount_amount DECIMAL(10, 2),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_history_user_id ON loyalty_history(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_history_created_at ON loyalty_history(created_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_history_order_id ON loyalty_history(order_id);

