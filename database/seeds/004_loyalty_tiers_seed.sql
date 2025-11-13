-- Seed data for loyalty_tiers table
-- Insert 4 tiers: bronze, silver, gold, platinum

INSERT INTO loyalty_tiers (name, min_orders, min_spent, discount_rate, benefits) VALUES
  ('bronze', 0, 0, 0, '{"description": "브론즈 등급 - 기본 혜택"}'),
  ('silver', 5, 100000, 5, '{"description": "실버 등급 - 5% 할인", "min_orders": 5, "min_spent": 100000}'),
  ('gold', 15, 300000, 10, '{"description": "골드 등급 - 10% 할인", "min_orders": 15, "min_spent": 300000}'),
  ('platinum', 30, 700000, 20, '{"description": "플래티넘 등급 - 20% 할인", "min_orders": 30, "min_spent": 700000}')
ON CONFLICT (name) DO NOTHING;

