-- Convert existing UPI payments to cash (safest default)
UPDATE `customer_payments` SET `payment_mode` = 'cash' WHERE `payment_mode` = 'upi';
