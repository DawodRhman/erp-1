import "dotenv/config";
import { Pool } from "pg";

const inventoryControlTables = [
  "inventory_locations",
  "inventory_stock_reservations",
  "inventory_receipts",
  "inventory_receipt_items",
  "inventory_adjustments",
  "inventory_outbox",
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

try {
  const [tables, locations, negativeStock, missingSku, duplicateSku, missingCategory, duplicateSerial, serialQuantityDrift] = await Promise.all([
    pool.query(
      "select count(*)::int total from information_schema.tables where table_schema = 'public' and table_name = any($1)",
      [inventoryControlTables],
    ),
    pool.query("select count(*)::int total from inventory_locations where active = true"),
    pool.query("select count(*)::int total from products where coalesce(quantity, 0) < 0"),
    pool.query("select count(*)::int total from products where sku is null or btrim(sku) = ''"),
    pool.query("select count(*)::int total from (select sku from products group by sku having count(*) > 1) duplicates"),
    pool.query("select count(*)::int total from products where upper(coalesce(product_type, 'ASSET')) <> 'SERVICE' and category_id is null"),
    pool.query("select count(*)::int total from (select serial_number from inventory_items where serial_number is not null and btrim(serial_number) <> '' group by serial_number having count(*) > 1) duplicates"),
    pool.query(`
      select count(*)::int total
      from products p
      where upper(coalesce(p.tracking_type, 'NONE')) in ('SERIAL', 'IMEI')
        and coalesce(p.quantity, 0) <> (
          select count(*)::numeric
          from inventory_items i
          where i.product_id = p.id
            and i.current_status = 'AVAILABLE'
        )
    `),
  ]);

  const result = {
    ok:
      tables.rows[0].total === inventoryControlTables.length &&
      locations.rows[0].total > 0 &&
      negativeStock.rows[0].total === 0 &&
      missingSku.rows[0].total === 0 &&
      duplicateSku.rows[0].total === 0 &&
      missingCategory.rows[0].total === 0 &&
      duplicateSerial.rows[0].total === 0 &&
      serialQuantityDrift.rows[0].total === 0,
    controlTables: `${tables.rows[0].total}/${inventoryControlTables.length}`,
    activeLocations: locations.rows[0].total,
    negativeStockProducts: negativeStock.rows[0].total,
    missingSku: missingSku.rows[0].total,
    duplicateSku: duplicateSku.rows[0].total,
    missingPhysicalProductCategory: missingCategory.rows[0].total,
    duplicateSerialNumbers: duplicateSerial.rows[0].total,
    serialQuantityDriftProducts: serialQuantityDrift.rows[0].total,
  };

  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 1;
} finally {
  await pool.end();
}
