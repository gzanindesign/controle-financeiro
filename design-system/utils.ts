import { colors } from "./tokens";

export function getCssVariables(): Record<string, string> {
  return {
    "--color-primary": colors.primary[500],
    "--color-primary-dark": colors.primary[700],
    "--color-success": colors.success,
    "--color-danger": colors.danger,
    "--color-warning": colors.warning,
    "--color-info": colors.info,
    "--color-bg-base": colors.bg.base,
    "--color-bg-surface": colors.bg.surface,
    "--color-bg-elevated": colors.bg.elevated,
    "--color-bg-border": colors.bg.border,
    "--color-gray-400": colors.gray[400],
    "--color-gray-500": colors.gray[500],
    "--color-gray-600": colors.gray[600],
    "--color-gray-700": colors.gray[700],
    "--color-gray-800": colors.gray[800],
  };
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
