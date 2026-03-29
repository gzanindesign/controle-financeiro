"use client";

import { useState } from "react";

export interface TabItem {
  id: string;
  label: string;
  color?: string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
}

export function Tabs({ items, value, onChange }: TabsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className="flex items-center gap-1.5 text-sm font-medium transition-all"
            style={{
              padding: "5px 14px",
              borderRadius: 9999,
              border: active
                ? `1.5px solid var(--color-primary)`
                : `1.5px solid var(--bg-border)`,
              backgroundColor: active ? "rgba(37,99,235,0.12)" : "transparent",
              color: active ? "var(--color-primary)" : "var(--color-text-muted)",
              cursor: "pointer",
            }}
          >
            {item.color && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: item.color,
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
