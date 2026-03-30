export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto animate-pulse">
      <div className="h-7 w-40 rounded-lg mb-6" style={{ background: "var(--bg-elevated)" }} />
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl p-5 h-48" style={{ background: "var(--bg-surface)" }} />
        ))}
      </div>
    </div>
  );
}
