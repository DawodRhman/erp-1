-- Up Migration

WITH product_prices(product_name, unit_price, cost_price) AS (
  VALUES
    ('Hikvision 2MP Bullet Camera', 17700.00, 14500.00),
    ('Dahua 4MP Dome Camera', 22000.00, 18000.00),
    ('CP Plus 5MP PTZ Camera', 95000.00, 78000.00),
    ('Hikvision 16CH DVR', 55000.00, 45500.00),
    ('Dahua 32CH NVR', 145000.00, 120000.00),
    ('Cisco 24-Port Switch', 98000.00, 83000.00),
    ('MikroTik RouterBoard', 28000.00, 22000.00),
    ('UniFi Access Point', 42000.00, 35000.00),
    ('ZKTeco Access Panel', 65000.00, 54000.00),
    ('Honeywell Smoke Detector', 8500.00, 6500.00),
    ('CAT6 Cable (per meter)', 120.00, 80.00),
    ('HDMI Cable 10m', 2500.00, 1800.00),
    ('Power Cable 3-pin', 450.00, 300.00),
    ('CCTV Annual Maintenance Contract', 120000.00, 90000.00),
    ('Access Control Software License', 85000.00, 65000.00),
    ('Cable Ties (pack of 100)', 650.00, 420.00),
    ('RJ45 Connectors (pack of 50)', 1200.00, 850.00),
    ('12V DC PSU', 10000.00, 7500.00),
    ('UPS 3KVA', 185000.00, 155000.00),
    ('Biometric Reader X7', 52000.00, 42000.00),
    ('Video Intercom Kit', 45000.00, 36000.00),
    ('Fiber Patch Cord LC-LC', 900.00, 600.00),
    ('PoE Injector 48V', 5500.00, 4200.00),
    ('Server Rack 42U', 135000.00, 110000.00),
    ('Thermal Camera PTZ', 475000.00, 390000.00),
    ('ANPR Camera', 210000.00, 170000.00),
    ('Electric Strike Lock', 8500.00, 6500.00),
    ('Door Controller Board', 22000.00, 17500.00),
    ('Surveillance HDD 8TB', 47000.00, 39500.00),
    ('Outdoor Junction Box', 1200.00, 850.00),
    ('PVC Conduit 25mm', 250.00, 175.00),
    ('Battery 12V 7Ah', 4500.00, 3300.00),
    ('Face Recognition Terminal', 75000.00, 62000.00),
    ('Elevator COP Integration Kit', 185000.00, 150000.00),
    ('Parking Barrier Arm', 145000.00, 118000.00),
    ('Turnstile Controller', 125000.00, 100000.00),
    ('Alarm Panel 8-Zone', 36000.00, 28500.00),
    ('VESDA Aspirating Detector', 240000.00, 195000.00),
    ('Gas Suppression Nozzle', 18000.00, 14500.00),
    ('Industrial Switch 8-port', 45000.00, 36500.00),
    ('LTE Failover Router', 36000.00, 29500.00),
    ('Explosion-proof Camera', 265000.00, 220000.00),
    ('Mobile DVR Enclosure IP67', 28500.00, 22000.00),
    ('Solar Panel 150W', 26000.00, 21000.00),
    ('Tower Camera Mast 6m', 82000.00, 65000.00),
    ('Microwave Link 1Gbps', 350000.00, 290000.00),
    ('Fiber OTDR Rental Day', 18000.00, 12000.00),
    ('Site Survey Consulting Day', 15000.00, 10000.00),
    ('Commissioning Day Rate', 25000.00, 18000.00),
    ('Training Essentials Seat', 12000.00, 8000.00),
    ('Integration API Pack', 150000.00, 110000.00),
    ('Keyboard for DVR', 3500.00, 2500.00),
    ('Mounting Bracket Universal', 1500.00, 950.00),
    ('Surge Protector PDU', 8500.00, 6500.00),
    ('PDU Monitored 16A', 42000.00, 35000.00),
    ('Ground Resistance Tester', 68000.00, 56000.00),
    ('Fiber Scope 400x', 45000.00, 36000.00),
    ('Label Printer Portable', 32000.00, 26000.00),
    ('Safety Vest Reflective', 950.00, 650.00),
    ('Hard Hat ANSI', 1200.00, 800.00),
    ('Crimping Tool Kit', 5500.00, 4200.00),
    ('Drill Bit Set Metal', 2800.00, 2100.00),
    ('Forklift Reach Truck Rent Day', 30000.00, 22000.00),
    ('Generator Diesel 50kVA Rent', 45000.00, 33000.00),
    ('Smart Analytics Channel', 18000.00, 12000.00),
    ('Health Check Quarterly', 75000.00, 52000.00),
    ('Extended Warranty 3yr', 60000.00, 42000.00),
    ('Penetration Test Bundle', 350000.00, 250000.00),
    ('Vulnerability Scan Quarterly', 125000.00, 90000.00),
    ('Firewall Rule Review Sprint', 95000.00, 65000.00),
    ('Guest Wi-Fi Portal Premium', 85000.00, 60000.00),
    ('SIEM Correlation Rule Pack', 175000.00, 130000.00),
    ('Container policy gate starter', 110000.00, 80000.00),
    ('Immutable backup connector Wasabi', 145000.00, 105000.00),
    ('Drone perimeter patrol lease monthly', 280000.00, 215000.00),
    ('Satellite failover modem BGAN', 420000.00, 350000.00),
    ('Mass SMS gateway redundancy pack', 95000.00, 70000.00),
    ('Incident tabletop cyber drill', 165000.00, 120000.00),
    ('Forklift inspection checklist digital', 45000.00, 30000.00),
    ('Cooling tower fill replacement job', 220000.00, 170000.00),
    ('Arc flash study lite', 185000.00, 140000.00),
    ('Battery recycling drum pickup batch', 35000.00, 24000.00),
    ('Certificate of destruction digital vault', 65000.00, 45000.00)
)
UPDATE public.products p
SET unit_price = product_prices.unit_price,
    cost_price = product_prices.cost_price,
    updated_at = NOW()
FROM product_prices
WHERE p.product_name = product_prices.product_name
  AND (
    COALESCE(p.unit_price, 0) = 0
    OR COALESCE(p.cost_price, 0) = 0
  );

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

-- Down Migration

-- Product prices are business data; do not reset them to zero on rollback.
