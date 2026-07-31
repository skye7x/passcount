export function toDateInput(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function dateInputToTimestamp(value: string): number | null {
  if (!value) return null;
  const ts = new Date(`${value}T00:00:00`).getTime();
  return isNaN(ts) ? null : ts;
}

export function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
