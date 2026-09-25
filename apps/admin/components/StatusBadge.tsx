export function StatusBadge({ status, variant }: { status: string; variant?: 'success' | 'warning' | 'error' | 'neutral' }) {
  const styles =
    variant === 'success'
      ? 'bg-success/10 text-success border-success/20'
      : variant === 'warning'
        ? 'bg-warning/10 text-warning border-warning/20'
        : variant === 'error'
          ? 'bg-error/10 text-error border-error/20'
          : 'bg-background text-text-secondary border-border';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <StatusBadge status="Verificat" variant="success" />
  ) : (
    <StatusBadge status="Neverificat" variant="neutral" />
  );
}
