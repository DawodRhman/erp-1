import { describe, expect, it } from 'vitest';
import { buildProductSkuPreview } from './InventoryProductPages';

describe('product SKU preview', () => {
  it('creates a readable SKU from brand and model as the user types', () => {
    expect(buildProductSkuPreview('Hikvision', 'DS-2CD2143G2-I')).toBe('HIKVISION-DS-2CD2143G2-I');
    expect(buildProductSkuPreview('ZKTeco', '')).toBe('ZKTECO');
    expect(buildProductSkuPreview('', 'X7 Pro')).toBe('X7-PRO');
  });

  it('removes punctuation and keeps the SKU within field limits', () => {
    expect(buildProductSkuPreview('ESSPL (Pvt.) Ltd.', 'AC/2026')).toBe('ESSPL-PVT-LTD-AC-2026');
  });
});
