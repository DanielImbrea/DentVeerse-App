/** Relative timestamp for feed cards (Romanian). */
export function formatFeedTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Acum';
  if (mins < 60) return `Acum ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Acum ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? 'Ieri' : `Acum ${days} zile`;

  return date.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}
