export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto animate-pulse">
      <div className="h-7 w-48 rounded-lg mb-6" style={{ background: "var(--bg-elevated)" }} />
      <div className="grid grid-cols-2 gap-4 mb-6" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl p-5 h-28" style={{ background: "var(--bg-surface)" }} />
        ))}
      </div>
      <div className="rounded-xl p-5 h-64" style={{ background: "var(--bg-surface)" }} />
    </div>
  );
}
