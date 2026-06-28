import { SkeletonTable } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main>
      <div className="telemetry-line" aria-hidden="true" />
      <header className="page-header">
        <p className="eyebrow">EAM</p>
        <div className="page-header-row">
          <div>
            <div
              className="skeleton skeleton-radius-md"
              style={{ width: 140, height: 38, marginBottom: 12 }}
              aria-hidden="true"
            />
            <div
              className="skeleton skeleton-radius-full"
              style={{ width: 320, height: 14 }}
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
      <form className="filter-bar">
        <div className="filter-row">
          <div className="skeleton skeleton-radius-sm" style={{ width: 260, height: 40 }} aria-hidden="true" />
          <div className="skeleton skeleton-radius-sm" style={{ width: 140, height: 40 }} aria-hidden="true" />
          <div className="skeleton skeleton-radius-sm" style={{ width: 90, height: 40 }} aria-hidden="true" />
        </div>
      </form>
      <SkeletonTable rows={10} cols={5} />
    </main>
  );
}