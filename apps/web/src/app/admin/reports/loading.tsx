import { SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main>
      <div className="telemetry-line" aria-hidden="true" />
      <header className="page-header">
        <p className="eyebrow">Relatórios operacionais</p>
        <div
          className="skeleton skeleton-radius-md"
          style={{ width: 200, height: 38, marginBottom: 12 }}
          aria-hidden="true"
        />
        <div
          className="skeleton skeleton-radius-full"
          style={{ width: 360, height: 14 }}
          aria-hidden="true"
        />
      </header>
      <div
        className="stats-strip"
        style={{ marginTop: 20 }}
        aria-busy="true"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <section
        className="section-grid two"
        style={{ marginTop: 14 }}
        aria-busy="true"
      >
        <SkeletonCard height={220} />
        <SkeletonCard height={220} />
      </section>
    </main>
  );
}