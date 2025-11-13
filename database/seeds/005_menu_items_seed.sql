-- Seed data for menu_items table
-- Menu items for all dinners

-- ============================================
-- Valentine Dinner
-- ============================================

-- Valentine Dinner: 기존 메뉴 항목 삭제
DELETE FROM menu_items  
WHERE dinner_id IN (SELECT id FROM dinners WHERE name = 'Valentine Dinner');

-- Valentine Dinner: 스테이크 (필수 항목, 최소 2개, 1개당 고기 0.2kg 차감)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '스테이크',
  2,
  '개',
  0,
  50000,
  true,
  false,
  true,
  true,
  5,
  2,
  (SELECT id FROM ingredients WHERE name = '고기'),
  0.2
FROM dinners d WHERE d.name = 'Valentine Dinner';

-- Valentine Dinner: 와인 (필수 항목, 최소 2잔, 1잔당 와인 0.2병 차감, 1병=5잔)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '와인',
  2,
  '잔',
  0,
  10000,
  true,
  false,
  true,
  true,
  5,
  2,
  (SELECT id FROM ingredients WHERE name = '와인'),
  0.2
FROM dinners d WHERE d.name = 'Valentine Dinner';

-- Valentine Dinner: 샐러드 (선택 항목, 0개로 시작, 추가/감소 가능, 1개당 채소 0.2kg 차감)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '샐러드',
  0,
  '개',
  0,
  15000,
  false,
  true,
  true,
  true,
  3,
  0,
  (SELECT id FROM ingredients WHERE name = '채소'),
  0.2
FROM dinners d WHERE d.name = 'Valentine Dinner';

-- Valentine Dinner: 바게트빵 (선택 항목, 0개로 시작, 추가/감소 가능)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '바게트빵',
  0,
  '개',
  0,
  5000,
  false,
  true,
  true,
  true,
  6,
  0,
  (SELECT id FROM ingredients WHERE name = '바게트빵'),
  1
FROM dinners d WHERE d.name = 'Valentine Dinner';

-- ============================================
-- French Dinner
-- ============================================

-- French Dinner: 기존 메뉴 항목 삭제
DELETE FROM menu_items 
WHERE dinner_id IN (SELECT id FROM dinners WHERE name = 'French Dinner');

-- French Dinner: 스테이크 (필수 항목, 최소 1개, 1개당 고기 0.2kg 차감)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '스테이크',
  1,
  '개',
  0,
  60000,
  true,
  false,
  true,
  true,
  3,
  1,
  (SELECT id FROM ingredients WHERE name = '고기'),
  0.2
FROM dinners d WHERE d.name = 'French Dinner';

-- French Dinner: 샐러드 (필수 항목, 최소 1개, 1개당 채소 0.2kg 차감)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '샐러드',
  1,
  '개',
  0,
  20000,
  true,
  false,
  true,
  true,
  3,
  1,
  (SELECT id FROM ingredients WHERE name = '채소'),
  0.2
FROM dinners d WHERE d.name = 'French Dinner';

-- French Dinner: 커피 (선택 항목, 기본 1잔, 삭제 가능, 0개까지 감소 가능)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '커피',
  1,
  '잔',
  0,
  5000,
  false,
  true,
  true,
  true,
  3,
  0,
  (SELECT id FROM ingredients WHERE name = '커피'),
  1
FROM dinners d WHERE d.name = 'French Dinner';

-- French Dinner: 와인 (선택 항목, 기본 1잔, 삭제 가능, 1잔당 와인 0.2병 차감, 1병=5잔)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '와인',
  1,
  '잔',
  0,
  10000,
  false,
  true,
  true,
  true,
  3,
  0,
  (SELECT id FROM ingredients WHERE name = '와인'),
  0.2
FROM dinners d WHERE d.name = 'French Dinner';

-- ============================================
-- English Dinner
-- ============================================

-- English Dinner: 기존 메뉴 항목 삭제
DELETE FROM menu_items 
WHERE dinner_id IN (SELECT id FROM dinners WHERE name = 'English Dinner');

-- English Dinner: 스테이크 (필수 항목, 최소 1개, 1개당 고기 0.2kg 차감)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '스테이크',
  1,
  '개',
  0,
  55000,
  true,
  false,
  true,
  true,
  3,
  1,
  (SELECT id FROM ingredients WHERE name = '고기'),
  0.2
FROM dinners d WHERE d.name = 'English Dinner';

-- English Dinner: 바게트빵 (필수 항목, 최소 1개)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '바게트빵',
  1,
  '개',
  0,
  5000,
  true,
  false,
  true,
  true,
  6,
  1,
  (SELECT id FROM ingredients WHERE name = '바게트빵'),
  1
FROM dinners d WHERE d.name = 'English Dinner';

-- English Dinner: 베이컨 (선택 항목, 기본 1개, 삭제 가능, 0개까지 감소 가능, 1개당 고기 0.1kg 차감)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '베이컨',
  1,
  '개',
  0,
  12000,
  false,
  true,
  true,
  true,
  4,
  0,
  (SELECT id FROM ingredients WHERE name = '고기'),
  0.1
FROM dinners d WHERE d.name = 'English Dinner';

-- English Dinner: 에그스크램블 (선택 항목, 기본 1개, 삭제 가능, 0개까지 감소 가능)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '에그스크램블',
  1,
  '개',
  0,
  15000,
  false,
  true,
  true,
  true,
  3,
  0,
  (SELECT id FROM ingredients WHERE name = '계란'),
  1
FROM dinners d WHERE d.name = 'English Dinner';

-- ============================================
-- Champagne Feast
-- ============================================

-- Champagne Feast: 기존 메뉴 항목 삭제
DELETE FROM menu_items 
WHERE dinner_id IN (SELECT id FROM dinners WHERE name = 'Champagne Feast');

-- Champagne Feast: 샴페인 (필수 항목, 최소 1병)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '샴페인',
  1,
  '병',
  0,
  15000,
  true,
  false,
  true,
  true,
  3,
  1,
  (SELECT id FROM ingredients WHERE name = '샴페인'),
  1
FROM dinners d WHERE d.name = 'Champagne Feast';

-- Champagne Feast: 스테이크 (필수 항목, 최소 2개, 1개당 고기 0.2kg 차감)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '스테이크',
  2,
  '개',
  0,
  70000,
  true,
  false,
  true,
  true,
  5,
  2,
  (SELECT id FROM ingredients WHERE name = '고기'),
  0.2
FROM dinners d WHERE d.name = 'Champagne Feast';

-- Champagne Feast: 바게트빵 (기본 4개, 최대 6개, 0개까지 감소 가능)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '바게트빵',
  4,
  '개',
  0,
  3000,
  false,
  true,
  true,
  true,
  6,
  0,
  (SELECT id FROM ingredients WHERE name = '바게트빵'),
  1
FROM dinners d WHERE d.name = 'Champagne Feast';

-- Champagne Feast: 커피 (1포트 = 5잔, 다른 디너 커피 가격의 5잔 기준: 5,000원 × 5잔 = 25,000원, 최대 1포트까지 추가 가능, 삭제 가능, 0개까지 감소 가능, 기본 가격 없음)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '커피',
  1,
  '포트',
  0,
  25000,
  false,
  true,
  true,
  true,
  1,
  0,
  (SELECT id FROM ingredients WHERE name = '커피'),
  5
FROM dinners d WHERE d.name = 'Champagne Feast';

-- Champagne Feast: 와인 (선택 항목, 기본 2잔, 삭제 가능, 0개까지 감소 가능, 1잔당 와인 0.2병 차감, 1병=5잔)
INSERT INTO menu_items (dinner_id, name, default_quantity, unit, base_price, additional_price, is_required, can_remove, can_increase, can_decrease, max_quantity, min_quantity, ingredient_id, ingredient_quantity_per_unit)
SELECT 
  d.id,
  '와인',
  2,
  '잔',
  0,
  20000,
  false,
  true,
  true,
  true,
  5,
  0,
  (SELECT id FROM ingredients WHERE name = '와인'),
  0.2
FROM dinners d WHERE d.name = 'Champagne Feast';


