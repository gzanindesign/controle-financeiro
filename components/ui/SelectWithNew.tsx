"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus } from "lucide-react";
import { CategoryIcon } from "./IconPicker";

interface Option {
  value: string;
  label: string;
  icon?: string;
  color?: string;
}

interface SelectWithNewProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  onNew?: () => void;
  newLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function SelectWithNew({ value, onChange, options, placeholder = "— Selecione —", onNew, newLabel = "+ Nova", className, disabled }: SelectWithNewProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Calcula posição do dropdown relativa à viewport
  function handleOpen() {
    if (disabled) return;
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = Math.min(options.length * 36 + (onNew ? 44 : 0) + 8, 240);
      const showAbove = spaceBelow < dropdownHeight + 8;

      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        ...(showAbove
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }
    setOpen((p) => !p);
  }

  const selected = options.find((o) => o.value === value);

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{
        ...dropdownStyle,
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--bg-border)",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        overflow: "hidden",
        maxHeight: 240,
        overflowY: "auto",
      }}
    >
      {options.length === 0 && (
        <div className="px-3 py-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Nenhuma opção
        </div>
      )}
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="w-full text-left text-sm px-3 py-2 transition-colors hover:opacity-80 flex items-center gap-2"
          style={{
            backgroundColor: o.value === value ? "rgba(37,99,235,0.1)" : "transparent",
            color: o.value === value ? "var(--color-primary)" : "var(--color-text)",
          }}
          onClick={() => { onChange(o.value); setOpen(false); }}
        >
          {o.icon && o.color && (
            <span className="flex items-center justify-center rounded-md flex-shrink-0"
              style={{ width: 22, height: 22, backgroundColor: `${o.color}22` }}>
              <CategoryIcon name={o.icon} size={13} color={o.color} />
            </span>
          )}
          {o.label}
        </button>
      ))}

      {onNew && (
        <>
          <div style={{ height: 1, backgroundColor: "var(--bg-border)", margin: "2px 0" }} />
          <button
            type="button"
            className="w-full text-left text-sm px-3 py-2 flex items-center gap-1.5 font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--color-primary)", backgroundColor: "transparent" }}
            onClick={() => { setOpen(false); onNew(); }}
          >
            <Plus size={13} />
            {newLabel}
          </button>
        </>
      )}
    </div>
  ) : null;

  return (
    <div style={{ position: "relative" }} className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className="w-full flex items-center justify-between text-sm"
        style={{
          padding: "7px 10px",
          backgroundColor: "var(--bg-input)",
          border: "1px solid var(--bg-border)",
          borderRadius: 8,
          color: selected ? "var(--color-text)" : "var(--color-text-muted)",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.icon && selected?.color && (
            <span className="flex items-center justify-center rounded-md flex-shrink-0"
              style={{ width: 20, height: 20, backgroundColor: `${selected.color}22` }}>
              <CategoryIcon name={selected.icon} size={12} color={selected.color} />
            </span>
          )}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
        <ChevronDown size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
      </button>

      {typeof document !== "undefined" && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}
