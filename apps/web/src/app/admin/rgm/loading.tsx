import { SkeletonCard, SkeletonLine } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main>
      <div className="telemetry-line" aria-hidden="true" />
      <header className="page-header">
        <p className="eyebrow">Qualidade</p>
        <div
          className="skeleton skeleton-radius-md"
          style={{ width: 240, height: 38, marginBottom: 12 }}
          aria-hidden="true"
        />
        <div
          className="skeleton skeleton-radius-full"
          style={{ width: 380, height: 14 }}
          aria-hidden="true"
        />
      </header>
      <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
        <SkeletonCard height={120} />
        <div className="glass-card" style={{ padding: 20 }}>
          <SkeletonLine width="40%" />
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <SkeletonLine width="90%" />
            <SkeletonLine width="75%" />
            <SkeletonLine width="60%" />
          </div>
        </div>
      </div>
    </main>
  );
}