import { cn } from "@/lib/utils";

export function Table({ className, children }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full text-sm border-collapse", className)}>{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead style={{ borderBottom: "1px solid var(--bg-border)" }}>{children}</thead>;
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn("px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide", className)}
      style={{ color: "var(--color-text-muted)" }}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, style, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-3 py-2.5", className)}
      style={{ borderBottom: "1px solid var(--bg-border)", color: "var(--color-text)", ...style }}
      {...props}
    >
      {children}
    </td>
  );
}

export function TotalRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tr
      className={cn("font-semibold", className)}
      style={{ borderTop: "2px solid var(--bg-border)", backgroundColor: "var(--bg-elevated)" }}
    >
      {children}
    </tr>
  );
}
