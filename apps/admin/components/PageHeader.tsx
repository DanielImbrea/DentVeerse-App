export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{title}</h1>
      {description ? <p className="mt-1.5 text-sm text-text-secondary">{description}</p> : null}
    </header>
  );
}
