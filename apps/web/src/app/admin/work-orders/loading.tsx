import { SkeletonTable } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="page-shell">
      <div className="telemetry-line" aria-hidden="true" />
      <header className="page-header">
        <p className="eyebrow">Execução em campo</p>
        <div className="page-header-row">
          <div>
            <div
              className="skeleton skeleton-radius-md"
              style={{ width: 240, height: 38, marginBottom: 12 }}
              aria-hidden="true"
            />
            <div
              className="skeleton skeleton-radius-full"
              style={{ width: 420, height: 14 }}
              aria-hidden="true"
            />
          </div>
          <div
            className="skeleton skeleton-radius-full"
            style={{ width: 110, height: 40 }}
            aria-hidden="true"
          />
        </div>
      </header>
      <div className="filter-bar">
        <div className="filter-row">
          <div className="skeleton skeleton-radius-sm" style={{ width: 220, height: 40 }} aria-hidden="true" />
          <div className="skeleton skeleton-radius-sm" style={{ width: 140, height: 40 }} aria-hidden="true" />
          <div className="skeleton skeleton-radius-sm" style={{ width: 140, height: 40 }} aria-hidden="true" />
          <div className="skeleton skeleton-radius-sm" style={{ width: 140, height: 40 }} aria-hidden="true" />
          <div className="skeleton skeleton-radius-sm" style={{ width: 90, height: 40 }} aria-hidden="true" />
        </div>
      </div>
      <SkeletonTable rows={10} cols={7} />
    </main>
  );
}