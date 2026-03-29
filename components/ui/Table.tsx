import React from "react";
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
  const childArray = React.Children.toArray(children);
  const styledChildren = childArray.map((child, index) => {
    if (!React.isValidElement(child)) return child;
    const isFirst = index === 0;
    const isLast = index === childArray.length - 1;
    const extraStyle: React.CSSProperties = {};
    if (isFirst) { extraStyle.borderTopLeftRadius = "8px"; extraStyle.borderBottomLeftRadius = "8px"; }
    if (isLast) { extraStyle.borderTopRightRadius = "8px"; extraStyle.borderBottomRightRadius = "8px"; }
    const existing = (child as React.ReactElement<{ style?: React.CSSProperties }>).props.style ?? {};
    return React.cloneElement(child as React.ReactElement<{ style?: React.CSSProperties }>, {
      style: { ...existing, borderBottom: "none", ...extraStyle },
    });
  });

  return (
    <tr
      className={cn("font-semibold", className)}
      style={{ backgroundColor: "var(--bg-elevated)" }}
    >
      {styledChildren}
    </tr>
  );
}
