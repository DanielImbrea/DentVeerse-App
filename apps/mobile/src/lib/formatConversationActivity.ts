/** Subtitle for chat header — when the conversation was last active. */
export function formatConversationActivity(iso: string | null | undefined): string {
  if (!iso) return '';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return `Ultimul mesaj astăzi, ${time}`;
  if (diffDays === 1) return `Ultimul mesaj ieri, ${time}`;
  if (diffDays < 7) {
    const weekday = date.toLocaleDateString('ro-RO', { weekday: 'long' });
    return `Ultimul mesaj ${weekday}, ${time}`;
  }

  const formatted = date.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
  return `Ultimul mesaj ${formatted}, ${time}`;
}
