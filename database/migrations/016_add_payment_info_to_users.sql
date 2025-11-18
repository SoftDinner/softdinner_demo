-- Add payment information to users table
-- This allows customers to save their payment information for faster checkout

ALTER TABLE users
ADD COLUMN IF NOT EXISTS card_number TEXT,
ADD COLUMN IF NOT EXISTS card_expiry TEXT,
ADD COLUMN IF NOT EXISTS card_cvc TEXT;

-- Add comment to explain encrypted storage should be used in production
COMMENT ON COLUMN users.card_number IS 'Card number - should be encrypted in production';
COMMENT ON COLUMN users.card_expiry IS 'Card expiry date in MM/YY format';
COMMENT ON COLUMN users.card_cvc IS 'Card CVC - should be encrypted in production';
