-- Create voice_orders table
-- This table stores voice order transcripts and recognized items

CREATE TABLE IF NOT EXISTS voice_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  voice_transcript TEXT,
  recognized_items JSONB,
  confidence_score DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_voice_orders_order_id ON voice_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_voice_orders_created_at ON voice_orders(created_at);

