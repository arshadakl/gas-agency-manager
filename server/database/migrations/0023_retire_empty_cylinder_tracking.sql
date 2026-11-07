-- Migration 0023: Retire empty cylinder stock tracking
-- Sets all empty counts to 0. Empty cylinders returned on purchases will only be recorded
-- in purchase_items.returned_qty for supplier reconciliation, without tracking warehouse empty stock.

UPDATE `cylinder_stock` SET `empty_count` = 0;

