-- TRACK360 Inventory workspace
-- Core inventory tables: products, inventory_items, inventory_movements,
-- purchase_orders, purchase_order_items, installer_field_dispatches,
-- installer_dispatch_items.

SELECT
    p.id,
    p.product_name,
    p.product_type,
    p.tracking_type,
    p.quantity AS current_stock,
    p.min_stock_level,
    p.unit_price,
    p.cost_price,
    p.updated_at
FROM public.products AS p
ORDER BY p.product_name;
