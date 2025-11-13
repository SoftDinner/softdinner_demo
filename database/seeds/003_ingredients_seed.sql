-- Seed data for ingredients table
-- Insert 7 ingredients: 고기, 채소, 와인, 샴페인, 커피, 바게트빵, 계란

-- 기존 데이터의 단위를 먼저 업데이트
UPDATE ingredients SET unit = 'kg' WHERE name = '고기';
UPDATE ingredients SET unit = 'kg' WHERE name = '채소';
UPDATE ingredients SET unit = '알' WHERE name = '계란';

INSERT INTO ingredients (name, quantity, unit, category) VALUES
  ('고기', 100, 'kg', 'meat'),
  ('채소', 200, 'kg', 'vegetable'),
  ('와인', 50, '병', 'beverage'),
  ('샴페인', 30, '병', 'beverage'),
  ('커피', 100, '잔', 'beverage'),
  ('바게트빵', 200, '개', 'bread'),
  ('계란', 150, '알', 'dairy')
ON CONFLICT (name) DO UPDATE SET 
  unit = EXCLUDED.unit,
  quantity = EXCLUDED.quantity;

