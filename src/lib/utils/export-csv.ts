type CsvValue = string | number | boolean | null | undefined;

function safeCell(value: CsvValue): string {
  const text = value == null ? "" : String(value);
  const formulaSafe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${formulaSafe.replaceAll('"', '""')}"`;
}

export function exportCsv(
  filename: string,
  headers: readonly string[],
  rows: readonly (readonly CsvValue[])[],
): void {
  const content = [headers, ...rows]
    .map((row) => row.map(safeCell).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${content}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
