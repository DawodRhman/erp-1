export function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function padEmp(n) {
  return `EMP${String(n).padStart(3, '0')}`;
}

export function fmtDate(d) {
  if (typeof d === 'string') return d.split('T')[0];
  return d.toISOString().split('T')[0];
}

export function addMonths(isoDateStr, months) {
  const d = new Date(isoDateStr + 'Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  return fmtDate(d);
}

/** DD-MM-YYYY for employee_info.date_of_birth */
export function toDMY(isoDateStr) {
  const [y, m, d] = isoDateStr.split('-');
  return `${d}-${m}-${y}`;
}

export function getWeekdaysBetween(startIso, endIso, holidaySet) {
  const out = [];
  const d0 = new Date(startIso + 'T00:00:00Z');
  const end = new Date(endIso + 'T00:00:00Z');
  const d = new Date(d0);
  while (d <= end) {
    const dow = d.getUTCDay();
    const iso = fmtDate(d);
    if (dow !== 0 && dow !== 6 && !holidaySet.has(iso)) out.push(iso);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function pakistanHolidaySet() {
  const h = new Set();
  for (let y = 1990; y <= 2026; y++) {
    h.add(`${y}-02-05`);
    h.add(`${y}-03-23`);
    h.add(`${y}-05-01`);
    h.add(`${y}-08-14`);
    h.add(`${y}-11-09`);
    h.add(`${y}-12-25`);
  }
  return h;
}

export async function batchInsert(client, sqlPrefix, columns, rows, chunk = 500) {
  if (rows.length === 0) return;
  const colCount = columns.length;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const placeholders = slice
      .map((row, ri) => {
        const base = ri * colCount;
        return `(${columns.map((_, ci) => `$${base + ci + 1}`).join(', ')})`;
      })
      .join(', ');
    const flat = slice.flat();
    await client.query(`${sqlPrefix} VALUES ${placeholders}`, flat);
  }
}
