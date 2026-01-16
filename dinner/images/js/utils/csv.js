// Minimal RFC4180 CSV parser with support for quoted fields and newlines within quotes
// Returns { data: Array<object>, headers: string[] }

export function parseCSV(text, { header = true, skipEmptyLines = true } = {}) {
  const rows = [];
  let i = 0; const len = text.length;
  let field = '';
  let row = [];
  let inQuotes = false;

  function endField() {
    // Normalize Windows newlines inside fields
    const val = field.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    row.push(val);
    field = '';
  }
  function endRow() {
    if (skipEmptyLines && row.length === 1 && row[0].trim() === '') { row = []; return; }
    rows.push(row);
    row = [];
  }

  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        // Escape sequence for double quote
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { endField(); i++; continue; }
    if (ch === '\n') { endField(); endRow(); i++; continue; }
    if (ch === '\r') { // handle isolated CR
      endField(); if (text[i + 1] === '\n') i++; endRow(); i++; continue;
    }
    field += ch; i++;
  }
  // Flush last field/row
  endField(); endRow();

  if (!header) return { data: rows, headers: [] };
  const headers = rows.shift() || [];
  const data = rows.map(r => {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      let v = (r[j] ?? '').trim();
      if (v.toLowerCase() === 'nan') v = '';
      obj[headers[j]] = v;
    }
    return obj;
  });
  return { data, headers };
}

