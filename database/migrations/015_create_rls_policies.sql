-- Row Level Security (RLS) Policies
-- This file contains RLS policies for all tables

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dinners ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_history ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Staff can read all user data
CREATE POLICY "Staff can read all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Dinners table policies
-- Everyone can read dinners (public menu)
CREATE POLICY "Everyone can read dinners" ON dinners
  FOR SELECT USING (true);

-- Only staff can modify dinners
CREATE POLICY "Staff can modify dinners" ON dinners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Styles table policies
-- Everyone can read styles
CREATE POLICY "Everyone can read styles" ON styles
  FOR SELECT USING (true);

-- Only staff can modify styles
CREATE POLICY "Staff can modify styles" ON styles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Menu items table policies
-- Everyone can read menu items
CREATE POLICY "Everyone can read menu items" ON menu_items
  FOR SELECT USING (true);

-- Only staff can modify menu items
CREATE POLICY "Staff can modify menu items" ON menu_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Ingredients table policies
-- Only staff can access ingredients
CREATE POLICY "Staff can access ingredients" ON ingredients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Ingredient logs table policies
-- Only staff can access ingredient logs
CREATE POLICY "Staff can access ingredient logs" ON ingredient_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Orders table policies
-- Customers can read their own orders
CREATE POLICY "Customers can read own orders" ON orders
  FOR SELECT USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'customer'
    )
  );

-- Customers can create their own orders
CREATE POLICY "Customers can create own orders" ON orders
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'customer'
    )
  );

-- Staff can read all orders
CREATE POLICY "Staff can read all orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Staff can update orders
CREATE POLICY "Staff can update orders" ON orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Order items table policies
-- Customers can read order items for their own orders
CREATE POLICY "Customers can read own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

-- Staff can read all order items
CREATE POLICY "Staff can read all order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Cooking tasks table policies
-- Staff can read their own cooking tasks
CREATE POLICY "Staff can read own cooking tasks" ON cooking_tasks
  FOR SELECT USING (
    staff_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Staff can update their own cooking tasks
CREATE POLICY "Staff can update own cooking tasks" ON cooking_tasks
  FOR UPDATE USING (
    staff_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Delivery tasks table policies
-- Staff can read their own delivery tasks
CREATE POLICY "Staff can read own delivery tasks" ON delivery_tasks
  FOR SELECT USING (
    staff_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Staff can update their own delivery tasks
CREATE POLICY "Staff can update own delivery tasks" ON delivery_tasks
  FOR UPDATE USING (
    staff_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Voice orders table policies
-- Customers can read their own voice orders
CREATE POLICY "Customers can read own voice orders" ON voice_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = voice_orders.order_id AND orders.user_id = auth.uid()
    )
  );

-- Staff can read all voice orders
CREATE POLICY "Staff can read all voice orders" ON voice_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Loyalty tiers table policies
-- Everyone can read loyalty tiers
CREATE POLICY "Everyone can read loyalty tiers" ON loyalty_tiers
  FOR SELECT USING (true);

-- Only staff can modify loyalty tiers
CREATE POLICY "Staff can modify loyalty tiers" ON loyalty_tiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Loyalty history table policies
-- Customers can read their own loyalty history
CREATE POLICY "Customers can read own loyalty history" ON loyalty_history
  FOR SELECT USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'customer'
    )
  );

-- Staff can read all loyalty history
CREATE POLICY "Staff can read all loyalty history" ON loyalty_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

