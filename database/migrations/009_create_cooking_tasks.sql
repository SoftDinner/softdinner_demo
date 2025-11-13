-- Create cooking_tasks table
-- This table tracks cooking tasks assigned to staff

CREATE TABLE IF NOT EXISTS cooking_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cooking_tasks_order_id ON cooking_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_cooking_tasks_status ON cooking_tasks(status);
CREATE INDEX IF NOT EXISTS idx_cooking_tasks_staff_id ON cooking_tasks(staff_id);

-- Add updated_at trigger
CREATE TRIGGER update_cooking_tasks_updated_at
  BEFORE UPDATE ON cooking_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

