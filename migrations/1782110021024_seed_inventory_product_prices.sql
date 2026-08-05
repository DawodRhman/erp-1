UPDATE public.products
SET
  unit_price = CASE
    WHEN product_name ILIKE '%2MP%' OR product_name ILIKE '%4MP%' THEN 5000
    WHEN product_name ILIKE '%PTZ%' OR product_name ILIKE '%thermal%' OR product_name ILIKE '%ANPR%' OR product_name ILIKE '%explosion%' THEN 25000
    WHEN product_name ILIKE '%DVR%' OR product_name ILIKE '%NVR%' THEN 45000
    WHEN product_name ILIKE '%HDD%' THEN 32000
    WHEN product_name ILIKE '%switch%' THEN 18000
    WHEN product_name ILIKE '%router%' OR product_name ILIKE '%LTE%' OR product_name ILIKE '%microwave%' THEN 24000
    WHEN product_name ILIKE '%UPS%' THEN 35000
    WHEN product_name ILIKE '%battery%' THEN 4500
    WHEN product_name ILIKE '%cable%' OR product_name ILIKE '%conduit%' OR product_name ILIKE '%connector%' OR product_name ILIKE '%patch cord%' THEN 150
    WHEN product_name ILIKE '%bracket%' OR product_name ILIKE '%box%' OR product_name ILIKE '%ties%' THEN 750
    WHEN product_name ILIKE '%biometric%' OR product_name ILIKE '%face recognition%' THEN 22000
    WHEN product_name ILIKE '%controller%' OR product_name ILIKE '%access panel%' OR product_name ILIKE '%strike lock%' THEN 16000
    WHEN product_name ILIKE '%smoke%' OR product_name ILIKE '%alarm%' OR product_name ILIKE '%VESDA%' OR product_name ILIKE '%suppression%' THEN 9000
    WHEN product_type = 'SERVICE' THEN 15000
    WHEN product_type = 'CONSUMABLE' THEN 1200
    ELSE 10000
  END,
  cost_price = CASE
    WHEN product_name ILIKE '%2MP%' OR product_name ILIKE '%4MP%' THEN 4200
    WHEN product_name ILIKE '%PTZ%' OR product_name ILIKE '%thermal%' OR product_name ILIKE '%ANPR%' OR product_name ILIKE '%explosion%' THEN 21000
    WHEN product_name ILIKE '%DVR%' OR product_name ILIKE '%NVR%' THEN 38000
    WHEN product_name ILIKE '%HDD%' THEN 27000
    WHEN product_name ILIKE '%switch%' THEN 15000
    WHEN product_name ILIKE '%router%' OR product_name ILIKE '%LTE%' OR product_name ILIKE '%microwave%' THEN 20000
    WHEN product_name ILIKE '%UPS%' THEN 30000
    WHEN product_name ILIKE '%battery%' THEN 3600
    WHEN product_name ILIKE '%cable%' OR product_name ILIKE '%conduit%' OR product_name ILIKE '%connector%' OR product_name ILIKE '%patch cord%' THEN 100
    WHEN product_name ILIKE '%bracket%' OR product_name ILIKE '%box%' OR product_name ILIKE '%ties%' THEN 500
    WHEN product_name ILIKE '%biometric%' OR product_name ILIKE '%face recognition%' THEN 18000
    WHEN product_name ILIKE '%controller%' OR product_name ILIKE '%access panel%' OR product_name ILIKE '%strike lock%' THEN 13000
    WHEN product_name ILIKE '%smoke%' OR product_name ILIKE '%alarm%' OR product_name ILIKE '%VESDA%' OR product_name ILIKE '%suppression%' THEN 7500
    WHEN product_type = 'SERVICE' THEN 12000
    WHEN product_type = 'CONSUMABLE' THEN 900
    ELSE 8000
  END,
  updated_at = NOW()
WHERE COALESCE(unit_price, 0) = 0
  AND COALESCE(cost_price, 0) = 0;

INSERT INTO public.product_price_tiers (product_id, tier_name, price)
SELECT p.id, tier.tier_name, ROUND((p.unit_price * tier.multiplier)::numeric, 2)
FROM public.products p
CROSS JOIN (
  VALUES
    ('TIER_A', 1.00),
    ('TIER_B', 0.95),
    ('TIER_C', 0.90),
    ('TIER_D', 0.85)
) AS tier(tier_name, multiplier)
WHERE COALESCE(p.unit_price, 0) > 0
ON CONFLICT (product_id, tier_name)
DO UPDATE SET price = EXCLUDED.price, updated_at = NOW();
