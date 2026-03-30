export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      <div className="h-7 w-40 rounded-lg mb-6" style={{ background: "var(--bg-elevated)" }} />
      <div className="rounded-xl mb-4 h-12" style={{ background: "var(--bg-surface)" }} />
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)" }}>
        <div className="h-10 w-full" style={{ background: "var(--bg-elevated)" }} />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-14 border-t flex items-center px-4 gap-4" style={{ borderColor: "var(--bg-border)" }}>
            <div className="h-4 w-20 rounded" style={{ background: "var(--bg-elevated)" }} />
            <div className="h-4 flex-1 rounded" style={{ background: "var(--bg-elevated)" }} />
            <div className="h-4 w-24 rounded" style={{ background: "var(--bg-elevated)" }} />
            <div className="h-4 w-20 rounded" style={{ background: "var(--bg-elevated)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
