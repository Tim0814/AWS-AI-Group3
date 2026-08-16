import Papa from 'papaparse';

/**
 * Parse a CSV File object.
 * Returns { data: Array<Object>, errors: string[] }
 */
export function parseCsv(file) {
  return new Promise(resolve => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      transform: v => v.trim(),
      complete: ({ data, errors }) => {
        resolve({
          data,
          errors: errors.map(e => `行 ${e.row ?? '?'}：${e.message}`),
        });
      },
    });
  });
}

/** Validate order rows; returns array of error strings */
export function validateOrderRows(rows) {
  const errs = [];
  const seen = new Set();
  rows.forEach((r, i) => {
    const n = i + 2; // 1-indexed + header
    if (!r.order_id) errs.push(`第 ${n} 行：缺少 order_id`);
    else if (seen.has(r.order_id)) errs.push(`第 ${n} 行：order_id "${r.order_id}" 重複`);
    else seen.add(r.order_id);
    if (!r.item && !r.sku_id) errs.push(`第 ${n} 行：缺少 item 或 sku_id`);
    if (!r.quantity || isNaN(Number(r.quantity))) errs.push(`第 ${n} 行：quantity 無效`);
  });
  return errs;
}
