"use client";

import { useState, useMemo } from "react";
import * as Icons from "lucide-react";
import { Input } from "./Input";

const ICON_LIST = [
  "Home","Building","Building2","Landmark","Hotel",
  "ShoppingCart","ShoppingBag","Store","Package","Tag","Tags",
  "Car","Fuel","Bus","Train","Plane","Bike","Truck",
  "Utensils","Coffee","Pizza","Apple","Beef","Beer","Wine","IceCream",
  "Heart","Activity","Pill","Stethoscope","Baby","Dog","Cat",
  "Tv","Smartphone","Laptop","Wifi","Monitor","Headphones","Music","Gamepad2",
  "BookOpen","GraduationCap","School","PenLine","Calculator",
  "Briefcase","DollarSign","CreditCard","Wallet","PiggyBank","TrendingUp","BarChart2",
  "Gift","PartyPopper","Camera","Image","Ticket","Star","Trophy",
  "Shirt","Scissors","Watch","Gem","Sparkles",
  "Dumbbell","Bike","Volleyball","Swords","Mountain","TreePine","Sun","Umbrella","Waves",
  "Zap","Flame","Droplets","Wind","Leaf","Recycle",
  "Wrench","Hammer","Paintbrush","Lightbulb","Key","Lock",
  "Globe","Map","MapPin","Navigation","Compass",
  "Users","User","UserCheck","Baby","Heart","Smile",
  "Plane","Ship","Tent","Backpack","Luggage",
  "Phone","Mail","MessageCircle","Bell","Calendar","Clock",
  "Settings","Shield","AlertCircle","HelpCircle","Info",
] as const;

const UNIQUE_ICONS = [...new Set(ICON_LIST)];

interface Props {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => UNIQUE_ICONS.filter((name) => name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  return (
    <div>
      <Input
        placeholder="Buscar ícone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2"
      />
      <div
        className="grid overflow-y-auto rounded-lg p-1"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(32px, 1fr))",
          gap: 2,
          maxHeight: 108,
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--bg-border)",
        }}
      >
        {filtered.map((name) => {
          const Icon = (Icons as Record<string, Icons.LucideIcon>)[name];
          if (!Icon) return null;
          const selected = value === name;
          return (
            <button
              key={name}
              title={name}
              onClick={() => onChange(name)}
              className="flex items-center justify-center rounded transition-all"
              style={{
                width: 32,
                height: 32,
                backgroundColor: selected ? "var(--color-primary)" : "transparent",
                color: selected ? "#fff" : "var(--color-text-muted)",
                border: selected ? "none" : "1px solid transparent",
              }}
            >
              <Icon size={15} />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full text-center py-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Nenhum ícone encontrado
          </p>
        )}
      </div>
    </div>
  );
}

export function CategoryIcon({ name, size = 16, color }: { name?: string | null; size?: number; color?: string }) {
  const Icon = name ? (Icons as Record<string, Icons.LucideIcon>)[name] : Icons.Tag;
  const style = color ? { color } : undefined;
  return Icon ? <Icon size={size} style={style} /> : <Icons.Tag size={size} style={style} />;
}
