export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="h-7 w-56 rounded mb-6" style={{ backgroundColor: "var(--bg-elevated)" }} />
      <div className="rounded-xl p-5" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        <div className="flex justify-between mb-4">
          <div className="h-5 w-32 rounded" style={{ backgroundColor: "var(--bg-elevated)" }} />
          <div className="h-8 w-24 rounded" style={{ backgroundColor: "var(--bg-elevated)" }} />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 py-3 border-t" style={{ borderColor: "var(--bg-border)" }}>
            <div className="h-4 flex-1 rounded" style={{ backgroundColor: "var(--bg-elevated)" }} />
            <div className="h-4 w-24 rounded" style={{ backgroundColor: "var(--bg-elevated)" }} />
            <div className="h-4 w-16 rounded" style={{ backgroundColor: "var(--bg-elevated)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
