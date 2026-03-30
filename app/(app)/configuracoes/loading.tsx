export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      <div className="h-7 w-40 rounded-lg mb-6" style={{ background: "var(--bg-elevated)" }} />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl mb-4 p-5 h-32" style={{ background: "var(--bg-surface)" }} />
      ))}
    </div>
  );
}
