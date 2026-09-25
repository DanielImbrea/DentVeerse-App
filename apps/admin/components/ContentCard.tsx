export function ContentCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`admin-card p-5 ${className}`}>{children}</div>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="admin-card p-12 text-center">
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  );
}
