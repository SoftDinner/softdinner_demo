-- Create delivery_tasks table
-- This table tracks delivery tasks assigned to staff

CREATE TABLE IF NOT EXISTS delivery_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  customer_address TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_order_id ON delivery_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_status ON delivery_tasks(status);
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_staff_id ON delivery_tasks(staff_id);

-- Add updated_at trigger
CREATE TRIGGER update_delivery_tasks_updated_at
  BEFORE UPDATE ON delivery_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

