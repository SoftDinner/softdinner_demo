-- Add foreign key constraints that were deferred due to table creation order
-- This file checks if constraints exist before adding them to avoid errors

-- Add FK constraint for menu_items.ingredient_id (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_menu_items_ingredient_id'
  ) THEN
    ALTER TABLE menu_items
      ADD CONSTRAINT fk_menu_items_ingredient_id
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add FK constraint for ingredient_logs.order_id (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_ingredient_logs_order_id'
  ) THEN
    ALTER TABLE ingredient_logs
      ADD CONSTRAINT fk_ingredient_logs_order_id
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
END $$;

