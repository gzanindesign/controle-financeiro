"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Input";
import { Trash2, Pencil, Plus, CreditCard } from "lucide-react";

interface CardItem { id: string; name: string; colorHex: string; bank: string; type: string }

export function ConfiguracoesClient({ cards: initial }: { cards: CardItem[] }) {
  const [cards, setCards] = useState(initial);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", colorHex: "#6366f1", bank: "", type: "MAIN" });
  const [loading, setLoading] = useState(false);

  function openAdd() { setForm({ name: "", colorHex: "#6366f1", bank: "", type: "MAIN" }); setModal("add"); }
  function openEdit(c: CardItem) { setEditingId(c.id); setForm({ name: c.name, colorHex: c.colorHex, bank: c.bank, type: c.type }); setModal("edit"); }

  async function save() {
    setLoading(true);
    if (modal === "add") {
      const res = await fetch("/api/cards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const card = await res.json();
      setCards((p) => [...p, { ...card, bank: card.bank ?? "" }]);
    } else if (modal === "edit" && editingId) {
      await fetch(`/api/cards/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setCards((p) => p.map((c) => c.id === editingId ? { ...c, ...form } : c));
    }
    setLoading(false); setModal(null);
  }

  async function remove(id: string) {
    if (!confirm("Remover cartão? Os lançamentos vinculados perderão a referência.")) return;
    await fetch(`/api/cards/${id}`, { method: "DELETE" });
    setCards((p) => p.filter((c) => c.id !== id));
  }

  const typeLabel: Record<string, string> = { MAIN: "Principal", DIGITAL: "Digital", ADDITIONAL: "Adicional" };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard size={16} style={{ color: "var(--color-primary)" }} />
            <CardTitle>Cartões</CardTitle>
          </div>
          <Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} className="inline mr-1" />Novo Cartão</Button>
        </CardHeader>

        {cards.length === 0 && (
          <p className="text-sm py-4 text-center" style={{ color: "var(--color-text-muted)" }}>Nenhum cartão cadastrado</p>
        )}

        <div className="flex flex-col gap-2">
          {cards.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-5 rounded" style={{ backgroundColor: c.colorHex }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{c.name}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {c.bank ? `${c.bank} · ` : ""}{typeLabel[c.type]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(c)} className="hover:opacity-70" style={{ color: "var(--color-text-muted)" }}><Pencil size={14} /></button>
                <button onClick={() => remove(c.id)} className="hover:opacity-70" style={{ color: "var(--color-danger)" }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === "add" ? "Novo Cartão" : "Editar Cartão"}>
        <div className="flex flex-col gap-4">
          <div><Label>Nome do Cartão</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="ex: Nubank, Itaú Visa..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Banco / Emissor</Label>
              <Input value={form.bank} onChange={(e) => setForm((p) => ({ ...p, bank: e.target.value }))} placeholder="ex: Nubank, Itaú..." />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                <option value="MAIN">Principal</option>
                <option value="DIGITAL">Digital</option>
                <option value="ADDITIONAL">Adicional</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Cor de Identificação</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.colorHex} onChange={(e) => setForm((p) => ({ ...p, colorHex: e.target.value }))} className="w-12 h-9 rounded cursor-pointer" style={{ padding: "2px", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }} />
              <Input value={form.colorHex} onChange={(e) => setForm((p) => ({ ...p, colorHex: e.target.value }))} className="flex-1" placeholder="#6366f1" />
              <div className="w-12 h-9 rounded flex-shrink-0" style={{ backgroundColor: form.colorHex }} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={save} disabled={loading || !form.name}>{loading ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
