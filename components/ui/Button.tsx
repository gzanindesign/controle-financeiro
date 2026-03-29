import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: { backgroundColor: "var(--color-primary)", color: "#fff" },
  ghost: { backgroundColor: "var(--bg-elevated)", color: "var(--color-text)", border: "1px solid var(--bg-border)" },
  danger: { backgroundColor: "var(--color-danger)", color: "#fff" },
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5",
  md: "px-4 py-2",
};

export function Button({ variant = "ghost", size = "md", className, style, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn("font-medium transition-opacity hover:opacity-80 disabled:opacity-40 cursor-pointer", sizeClasses[size], className)}
      style={{ borderRadius: "8px", fontSize: "14px", ...variantStyles[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
