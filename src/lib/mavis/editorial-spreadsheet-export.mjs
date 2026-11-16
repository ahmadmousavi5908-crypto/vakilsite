const FORMULA_PREFIX = /^[\u0000-\u0020\uFEFF]*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20]/u;
const CONTROL_PREFIX = /^[\u0000-\u0009\u000B\u000C\u000E-\u001F]/u;

function safeCell(value) {
  const text = value == null ? "" : String(value);
  const protectedText = FORMULA_PREFIX.test(text) || CONTROL_PREFIX.test(text) ? "'" + text : text;
  return '"' + protectedText.replace(/"/g, '""') + '"';
}

export function createEditorialSpreadsheetTsv(rows) {
  if (!Array.isArray(rows)) throw new TypeError("Spreadsheet rows must be an array.");
  return rows.map((row) => {
    if (!Array.isArray(row)) throw new TypeError("Each spreadsheet row must be an array.");
    return row.map(safeCell).join("\t");
  }).join("\r\n") + "\r\n";
}
