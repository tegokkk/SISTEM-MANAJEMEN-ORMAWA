export function csvCell(value: string | number | null | undefined) {
  const plain = String(value ?? '').replace(/[\r\n\t]/g, ' ').trim();
  const safe = /^[=+@-]/.test(plain) ? `'${plain}` : plain;
  return `"${safe.replace(/"/g, '""')}"`;
}
