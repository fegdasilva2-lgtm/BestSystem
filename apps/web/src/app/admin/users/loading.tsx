import { SkeletonCard, SkeletonLine } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="page-shell">
      <div className="telemetry-line" aria-hidden="true" />
      <header className="page-header">
        <p className="eyebrow">Identidade e acesso</p>
        <div
          className="skeleton skeleton-radius-md"
          style={{ width: 280, height: 38, marginBottom: 12 }}
          aria-hidden="true"
        />
        <SkeletonLine width="60%" />
      </header>
      <section className="profile-grid">
        <SkeletonCard height={220} />
        <SkeletonCard height={220} />
      </section>
    </main>
  );
}