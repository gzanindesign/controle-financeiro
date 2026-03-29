import { cn } from "@/lib/utils";

export function Input({ className, disabled, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      disabled={disabled}
      className={cn("w-full rounded px-3 py-2 text-sm outline-none transition", className)}
      style={{
        backgroundColor: "var(--bg-input)",
        border: "1px solid var(--bg-border)",
        color: "var(--color-text)",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : undefined,
      }}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn("w-full rounded px-3 py-2 text-sm outline-none transition", className)}
      style={{
        backgroundColor: "var(--bg-input)",
        border: "1px solid var(--bg-border)",
        color: "var(--color-text)",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-xs font-medium mb-1", className)}
      style={{ color: "var(--color-text-muted)" }}
      {...props}
    >
      {children}
    </label>
  );
}
