"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { SelectWithNew } from "@/components/ui/SelectWithNew";
import { Trash2, Pencil, Plus, CreditCard } from "lucide-react";

const PALETTE = [
  { hex: "#6366f1", label: "Azul" },
  { hex: "#22c55e", label: "Verde" },
  { hex: "#f97316", label: "Laranja" },
  { hex: "#ec4899", label: "Rosa" },
  { hex: "#a855f7", label: "Roxo" },
  { hex: "#ef4444", label: "Vermelho" },
  { hex: "#eab308", label: "Amarelo" },
  { hex: "#06b6d4", label: "Ciano" },
  { hex: "#14b8a6", label: "Teal" },
  { hex: "#64748b", label: "Grafite" },
];

interface CardItem { id: string; name: string; colorHex: string; bank: string; type: string }

export function ConfiguracoesClient({ cards: initial }: { cards: CardItem[] }) {
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", colorHex: "#6366f1", bank: "", type: "MAIN" });
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

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
    router.refresh();
  }

  function remove(id: string) {
    setConfirmModal({
      message: "Remover cartão? Os lançamentos vinculados perderão a referência.",
      onConfirm: async () => {
        await fetch(`/api/cards/${id}`, { method: "DELETE" });
        setCards((p) => p.filter((c) => c.id !== id));
        router.refresh();
      },
    });
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
                <button onClick={() => openEdit(c)} className="p-1 rounded hover:opacity-70" style={{ color: "var(--color-text-muted)" }}><Pencil size={16} /></button>
                <button onClick={() => remove(c.id)} className="p-1 rounded hover:opacity-70" style={{ color: "var(--color-danger)" }}><Trash2 size={16} /></button>
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
              <SelectWithNew
                value={form.type}
                onChange={(v) => setForm((p) => ({ ...p, type: v }))}
                options={[{ value: "MAIN", label: "Principal" }, { value: "DIGITAL", label: "Digital" }, { value: "ADDITIONAL", label: "Adicional" }]}
              />
            </div>
          </div>
          <div>
            <Label>Cor de Identificação</Label>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {PALETTE.map(({ hex, label }) => (
                <button
                  key={hex}
                  title={label}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, colorHex: hex }))}
                  className="transition-transform hover:scale-110"
                  style={{
                    width: 28, height: 28, borderRadius: "50%", backgroundColor: hex, flexShrink: 0,
                    outline: form.colorHex === hex ? `3px solid ${hex}` : "3px solid transparent",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={save} disabled={loading || !form.name}>{loading ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      </Modal>
      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} title="Confirmar exclusão">
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{confirmModal?.message}</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setConfirmModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}>Excluir</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
