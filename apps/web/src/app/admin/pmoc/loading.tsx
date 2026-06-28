import { SkeletonCard, SkeletonTable } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main>
      <div className="telemetry-line" aria-hidden="true" />
      <header className="page-header">
        <p className="eyebrow">Manutenção</p>
        <div
          className="skeleton skeleton-radius-md"
          style={{ width: 130, height: 38, marginBottom: 12 }}
          aria-hidden="true"
        />
        <div
          className="skeleton skeleton-radius-full"
          style={{ width: 280, height: 14 }}
          aria-hidden="true"
        />
      </header>
      <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
        <SkeletonCard height={200} />
        <SkeletonCard height={140} />
      </div>
    </main>
  );
}