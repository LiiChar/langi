export function PageHeading({ title, description }: { title: string; description?: string }) {
  return (
    <header className="page-heading">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
    </header>
  );
}
