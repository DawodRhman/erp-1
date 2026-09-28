import dotenv from 'dotenv';
import pool from '../src/config/db.js';

dotenv.config();

function estimateProductPrice(productName = '', productType = 'ASSET') {
  const name = String(productName || '').toLowerCase();
  if (name.includes('camera') && (name.includes('ptz') || name.includes('anpr'))) return [85000, 68000];
  if (name.includes('camera')) return [15000, 12000];
  if (name.includes('nvr') || name.includes('dvr')) return [45000, 36000];
  if (name.includes('access') && name.includes('panel')) return [30000, 24000];
  if (name.includes('smoke') || name.includes('detector')) return [8500, 6500];
  if (name.includes('barrier')) return [145000, 118000];
  if (name.includes('cable') || name.includes('cat6')) return [180, 120];
  if (name.includes('battery')) return [5500, 4200];
  if (name.includes('psu') || name.includes('power supply')) return [10000, 7800];
  if (name.includes('connector')) return [350, 220];
  if (name.includes('license') || name.includes('software')) return [25000, 18000];
  if (name.includes('maintenance') || name.includes('contract') || productType === 'SERVICE') return [30000, 0];
  if (productType === 'CONSUMABLE') return [750, 500];
  return [12000, 9000];
}

async function main() {
  const result = await pool.query(`
    SELECT id, product_name, product_type
    FROM public.products
    WHERE COALESCE(unit_price, 0) <= 0
    ORDER BY product_name
  `);

  for (const product of result.rows) {
    const [unitPrice, costPrice] = estimateProductPrice(product.product_name, product.product_type);
    await pool.query(
      `
        UPDATE public.products
        SET unit_price = $1,
            cost_price = CASE WHEN COALESCE(cost_price, 0) <= 0 THEN $2 ELSE cost_price END,
            updated_at = NOW()
        WHERE id = $3
      `,
      [unitPrice, costPrice, product.id],
    );
    console.log(`Set ${product.product_name}: unit Rs ${unitPrice}`);
  }

  console.log(`Updated ${result.rowCount} product price(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
