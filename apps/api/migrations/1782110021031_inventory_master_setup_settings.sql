-- Up Migration

INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES
  (
    'inventory_company_settings',
    '{"company_name":"Electronic Safety & Security Private Limited","ntn_number":"3628486-6","gst_number":"1700362848614","address":"","phone":"","bank_account_number":"24438000016603"}',
    'Inventory company profile used on settings, receipts and invoice defaults.'
  ),
  (
    'inventory_preferences',
    '{"default_min_stock_threshold":5,"low_stock_alert_email":""}',
    'Inventory preferences such as low stock thresholds and alert routing.'
  )
ON CONFLICT (setting_key) DO NOTHING;

-- Down Migration

DELETE FROM public.system_settings
WHERE setting_key IN ('inventory_company_settings', 'inventory_preferences');
