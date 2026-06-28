import { SkeletonTable } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="page-shell">
      <div className="telemetry-line" aria-hidden="true" />
      <header className="page-header">
        <p className="eyebrow">Operações contratuais</p>
        <div className="page-header-row">
          <div>
            <div
              className="skeleton skeleton-radius-md"
              style={{ width: 200, height: 38, marginBottom: 12 }}
              aria-hidden="true"
            />
            <div
              className="skeleton skeleton-radius-full"
              style={{ width: 380, height: 14 }}
              aria-hidden="true"
            />
          </div>
          <div
            className="skeleton skeleton-radius-full"
            style={{ width: 130, height: 40 }}
            aria-hidden="true"
          />
        </div>
      </header>
      <div className="filter-bar">
        <div className="filter-row">
          <div className="skeleton skeleton-radius-sm" style={{ width: 280, height: 40 }} aria-hidden="true" />
          <div className="skeleton skeleton-radius-sm" style={{ width: 140, height: 40 }} aria-hidden="true" />
          <div className="skeleton skeleton-radius-sm" style={{ width: 90, height: 40 }} aria-hidden="true" />
        </div>
      </div>
      <SkeletonTable rows={8} cols={7} />
    </main>
  );
}