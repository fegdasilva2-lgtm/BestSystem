import { SkeletonCard, SkeletonLine, SkeletonTable } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="page-shell">
      <div className="telemetry-line" aria-hidden="true" />
      <header className="page-header">
        <p className="eyebrow">Execução em campo</p>
        <div className="page-header-row">
          <div style={{ flex: 1 }}>
            <div
              className="skeleton skeleton-radius-md"
              style={{ width: 260, height: 38, marginBottom: 12 }}
              aria-hidden="true"
            />
            <SkeletonLine width="50%" />
          </div>
          <div
            className="skeleton skeleton-radius-full"
            style={{ width: 130, height: 40 }}
            aria-hidden="true"
          />
        </div>
      </header>

      <section
        className="section-grid two"
        style={{ marginTop: 14 }}
        aria-busy="true"
      >
        <SkeletonCard height={180} />
        <SkeletonCard height={180} />
      </section>

      <section style={{ marginTop: 28 }} aria-busy="true">
        <div
          className="skeleton skeleton-radius-md"
          style={{ width: 180, height: 22, marginBottom: 8 }}
          aria-hidden="true"
        />
        <SkeletonTable rows={6} cols={7} />
      </section>
    </main>
  );
}