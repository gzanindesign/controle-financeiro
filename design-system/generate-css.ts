import { getCssVariables } from "./utils";

export function generateCssRoot(): string {
  const vars = getCssVariables();
  const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`);
  return `:root {\n${lines.join("\n")}\n}`;
}
