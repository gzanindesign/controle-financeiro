import { Suspense } from "react";
import { MonthSelector } from "./MonthSelector";
import { CalendarDays } from "lucide-react";

export function Header() {
  return (
    <header
      className="flex items-center justify-between px-6 py-3 shrink-0"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderBottom: "1px solid var(--bg-border)",
        height: "56px",
      }}
    >
      <div className="flex items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
        <CalendarDays size={16} />
        <span className="text-xs">Mês de referência</span>
      </div>
      <Suspense fallback={<div className="w-40 h-6 animate-pulse rounded" style={{ background: "var(--bg-elevated)" }} />}>
        <MonthSelector />
      </Suspense>
    </header>
  );
}
