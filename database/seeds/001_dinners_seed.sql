-- Seed data for dinners table
-- Insert Valentine, French, English, Champagne Feast dinners

INSERT INTO dinners (name, base_price, description, available_styles, image_url) VALUES
  ('Valentine Dinner', 150000, '로맨틱한 발렌타인 디너 세트' || E'\n' || '작은 하트 모양과 큐피드가 장식된 접시에 냅킨과 함께 와인과 스테이크가 제공됩니다.', ARRAY['simple', 'grand', 'deluxe']::TEXT[], NULL),
  ('French Dinner', 200000, '프랑스 전통 디너 세트' || E'\n' || '커피 한잔, 와인 한잔, 샐러드, 스테이크가 제공됩니다.', ARRAY['simple', 'grand', 'deluxe']::TEXT[], NULL),
  ('English Dinner', 180000, '영국 전통 디너 세트' || E'\n' || '에그 스크램블, 베이컨, 빵, 스테이크가 제공됩니다.', ARRAY['simple', 'grand', 'deluxe']::TEXT[], NULL),
  ('Champagne Feast', 300000, '샴페인 축제 디너 세트' || E'\n' || '항상 인 식사이고, 샴페인 2병, 1개, 4개, 게트빵, 커피, 포트와인, 스테이크가 제공됩니다.', ARRAY['grand', 'deluxe']::TEXT[], NULL)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

