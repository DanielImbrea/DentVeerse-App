import Link from 'next/link';

export function StatCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href?: string;
  accent?: 'primary' | 'warning' | 'error';
}) {
  const accentBar =
    accent === 'warning' ? 'bg-warning' : accent === 'error' ? 'bg-error' : 'bg-primary';

  const inner = (
    <div className="admin-card relative overflow-hidden p-6 hover:shadow-md transition-shadow">
      <div className={`absolute left-0 top-0 h-full w-1 ${accentBar}`} />
      <p className="text-text-secondary text-sm font-medium">{label}</p>
      <p className="text-3xl font-semibold mt-2 tracking-tight text-text-primary">{value}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
        {inner}
      </Link>
    );
  }

  return inner;
}
