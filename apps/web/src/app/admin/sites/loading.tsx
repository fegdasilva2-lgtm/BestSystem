import { SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="page-shell narrow">
      <div className="telemetry-line" aria-hidden="true" />
      <header className="page-header">
        <p className="eyebrow">EAM</p>
        <div
          className="skeleton skeleton-radius-md"
          style={{ width: 220, height: 38, marginBottom: 12 }}
          aria-hidden="true"
        />
        <div
          className="skeleton skeleton-radius-full"
          style={{ width: 380, height: 14 }}
          aria-hidden="true"
        />
      </header>
      <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
        <SkeletonCard height={160} />
        <SkeletonTable rows={4} cols={3} />
      </div>
    </main>
  );
}