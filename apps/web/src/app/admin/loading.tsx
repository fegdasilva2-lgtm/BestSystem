import { SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="page-shell">
      <div className="telemetry-line" aria-hidden="true" />
      <header className="page-header">
        <p className="eyebrow">Painel operacional</p>
        <div className="page-header-row">
          <div>
            <div
              className="skeleton skeleton-radius-md"
              style={{ width: 220, height: 38, marginBottom: 12 }}
              aria-hidden="true"
            />
            <div
              className="skeleton skeleton-radius-full"
              style={{ width: 460, height: 14 }}
              aria-hidden="true"
            />
          </div>
        </div>
      </header>

      <div className="stats-strip stagger-children" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      <div style={{ marginTop: 28 }}>
        <SkeletonCard height={220} />
      </div>
    </main>
  );
}