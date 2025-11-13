-- Seed data for styles table
-- Insert simple, grand, deluxe styles

INSERT INTO styles (name, price_modifier, details) VALUES
  ('simple', 0, '심플 스타일: 플라스틱 접시와 플라스틱 컵, 종이 냅킨이 플라스틱 쟁반에 제공됩니다.'),
  ('grand', 10000, '그랜드 스타일: 도자기 접시와 도자기 컵, 흰색 면 냅킨이 나무 쟁반에 제공되고, 와인이 포함되면 잔은 플라스틱 잔에 제공됩니다. (+10,000원)'),
  ('deluxe', 20000, '디럭스 스타일: 꽃들이 있는 작은 꽃병, 도자기 접시와 도자기 컵, 린넨 냅킨이 나무 쟁반에 제공되고, 와인이 포함되면 잔은 유리 잔에 제공됩니다. (+20,000원)')
ON CONFLICT (name) DO UPDATE SET details = EXCLUDED.details;

