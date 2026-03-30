export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      <div className="h-7 w-52 rounded-lg mb-6" style={{ background: "var(--bg-elevated)" }} />
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl p-5 h-36" style={{ background: "var(--bg-surface)" }} />
        ))}
      </div>
      <div className="rounded-xl p-5 h-48" style={{ background: "var(--bg-surface)" }} />
    </div>
  );
}
