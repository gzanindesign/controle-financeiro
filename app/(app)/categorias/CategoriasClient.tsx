"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, TotalRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { SelectWithNew } from "@/components/ui/SelectWithNew";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { IconPicker, CategoryIcon } from "@/components/ui/IconPicker";

interface Card_ { id: string; name: string; colorHex: string }
interface Subcategory {
  id: string; name: string; dueDay: number | null;
  paymentMethod: string; cardId: string | null; card: Card_ | null;
  kind: string; budget: number; actual: number; paid: number;
}
interface Category { id: string; name: string; icon?: string | null; color?: string | null; subcategories: Subcategory[]; }

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

interface Props {
  categories: Category[];
  cards: Card_[];
  month: number;
  year: number;
}

export function CategoriasClient({ categories: initial, cards, month, year }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState(initial);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<"cat" | "editCat" | "sub" | "editSub" | null>(null);
  const [targetCatId, setTargetCatId] = useState<string>("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  function openConfirm(message: string, onConfirm: () => void) {
    setConfirmModal({ message, onConfirm });
  }

  async function handleConfirm() {
    confirmModal?.onConfirm();
    setConfirmModal(null);
  }

  function toggle(id: string) { setCollapsed((p) => ({ ...p, [id]: !p[id] })); }

  function openAddCat() { setForm({ name: "", icon: "Tag", color: "#6366f1" }); setModal("cat"); }
  function openEditCat(cat: Category) { setEditingCat(cat); setForm({ name: cat.name, icon: cat.icon || "Tag", color: cat.color || "#6366f1" }); setModal("editCat"); }
  function openAddSub(catId: string) { setTargetCatId(catId); setForm({ name: "", dueDay: "", paymentMethod: "CREDIT", cardId: "", budgetAmount: "", kind: "ESSENTIAL" }); setModal("sub"); }
  function openEditSub(sub: Subcategory) { setEditingSub(sub); setForm({ name: sub.name, dueDay: sub.dueDay ? String(sub.dueDay) : "", paymentMethod: sub.paymentMethod, cardId: sub.cardId ?? "", kind: sub.kind ?? "ESSENTIAL", budgetAmount: String(sub.budget) }); setModal("editSub"); }

  async function saveEditCat() {
    if (!editingCat) return;
    setLoading(true);
    const payload = { name: form.name, icon: form.icon || "Tag", color: form.color || "#6366f1" };
    await fetch(`/api/categories/${editingCat.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setCategories((p) => p.map((c) => c.id === editingCat.id ? { ...c, ...payload } : c));
    setLoading(false); setModal(null); setEditingCat(null);
    router.refresh();
  }

  async function saveCat() {
    setLoading(true);
    const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, icon: form.icon || "Tag", color: form.color || "#6366f1" }) });
    const cat = await res.json();
    setCategories((p) => [...p, { ...cat, subcategories: [] }]);
    setLoading(false); setModal(null);
    router.refresh();
  }

  async function saveSub() {
    setLoading(true);
    const res = await fetch("/api/subcategories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: targetCatId, name: form.name, dueDay: form.dueDay ? Number(form.dueDay) : null, paymentMethod: form.paymentMethod, cardId: form.cardId || null, kind: form.kind || "ESSENTIAL" }),
    });
    const sub = await res.json();
    const budgetValue = parseFloat(form.budgetAmount) || 0;
    if (budgetValue > 0) {
      await fetch("/api/budgets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subcategoryId: sub.id, month, year, budgetAmount: budgetValue, paidAmount: 0, applyToFuture: true }),
      });
    }
    const card = cards.find((c) => c.id === sub.cardId) ?? null;
    setCategories((p) => p.map((c) => c.id === targetCatId ? { ...c, subcategories: [...c.subcategories, { ...sub, card, budget: budgetValue, actual: 0, paid: 0 }] } : c));
    setLoading(false); setModal(null);
    router.refresh();
  }

  async function saveEditSub() {
    if (!editingSub) return;
    setLoading(true);
    const payload = { name: form.name, dueDay: form.dueDay ? Number(form.dueDay) : null, paymentMethod: form.paymentMethod, cardId: form.cardId || null, kind: form.kind };
    const budgetValue = parseFloat(form.budgetAmount) || 0;
    await fetch(`/api/subcategories/${editingSub.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (budgetValue !== editingSub.budget) {
      await fetch("/api/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subcategoryId: editingSub.id, month, year, budgetAmount: budgetValue, paidAmount: 0, applyToFuture: true }) });
    }
    const card = cards.find((c) => c.id === form.cardId) ?? null;
    setCategories((p) => p.map((cat) => ({
      ...cat,
      subcategories: cat.subcategories.map((s) => s.id === editingSub.id ? { ...s, ...payload, card, budget: budgetValue } : s),
    })));
    setLoading(false); setModal(null); setEditingSub(null);
    router.refresh();
  }

  function deleteCat(id: string) {
    openConfirm("Tem certeza que deseja remover esta categoria e todas as suas subcategorias?", async () => {
      await fetch(`/api/categories/${id}`, { method: "DELETE" });
      setCategories((p) => p.filter((c) => c.id !== id));
      router.refresh();
    });
  }

  function deleteSub(catId: string, subId: string) {
    openConfirm("Tem certeza que deseja remover esta subcategoria?", async () => {
      await fetch(`/api/subcategories/${subId}`, { method: "DELETE" });
      setCategories((p) => p.map((c) => c.id === catId ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subId) } : c));
      router.refresh();
    });
  }

  const grandTotal = { budget: 0, actual: 0, paid: 0, diff: 0 };
  categories.forEach((c) => c.subcategories.forEach((s) => {
    grandTotal.budget += s.budget; grandTotal.actual += s.actual; grandTotal.paid += s.paid; grandTotal.diff += s.budget - s.actual;
  }));

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="primary" size="sm" onClick={openAddCat}><Plus size={14} className="inline mr-1" />Nova Categoria</Button>
      </div>

      {categories.map((cat) => {
        const catBudget = cat.subcategories.reduce((s, x) => s + x.budget, 0);
        const catActual = cat.subcategories.reduce((s, x) => s + x.actual, 0);
        const catPaid = cat.subcategories.reduce((s, x) => s + x.paid, 0);
        const isCollapsed = collapsed[cat.id];

        return (
          <Card key={cat.id} className="mb-4 category-card" style={{ borderLeft: `4px solid ${cat.color ?? "#6366f1"}`, background: `linear-gradient(to right, ${cat.color ?? "#6366f1"}26 0%, var(--bg-surface) 40%)` }}>
            <div className="flex items-center justify-between mb-3">
              <button className="flex items-center gap-2 font-semibold text-sm" style={{ color: "var(--color-text)" }} onClick={() => toggle(cat.id)}>
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                <div className="flex items-center justify-center rounded-lg" style={{ width: 40, height: 40, backgroundColor: `${cat.color ?? "#6366f1"}22`, flexShrink: 0 }}>
                  <CategoryIcon name={cat.icon} size={20} color={cat.color ?? "#6366f1"} />
                </div>
                {cat.name}
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Teto: {formatCurrency(catBudget)} | Atual: {formatCurrency(catActual)} | Pago: {formatCurrency(catPaid)}
                </span>
                <Button size="sm" onClick={() => openAddSub(cat.id)}><Plus size={12} className="inline mr-1" />Sub</Button>
                <button onClick={() => openEditCat(cat)} className="p-1 rounded hover:opacity-70" style={{ color: "var(--color-text-muted)" }}><Pencil size={16} /></button>
                <button onClick={() => deleteCat(cat.id)} className="p-1 rounded hover:opacity-70" style={{ color: "var(--color-danger)" }}><Trash2 size={16} /></button>
              </div>
            </div>

            {!isCollapsed && (
              <Table>
                <colgroup>
                  <col />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 64 }} />
                </colgroup>
                <Thead>
                  <tr>
                    <Th>Subcategoria</Th>
                    <Th>Tipo</Th>
                    <Th className="text-right">Orçamento</Th>
                    <Th className="text-right">Atual</Th>
                    <Th className="text-right">Pago</Th>
                    <Th className="text-right">Diferença</Th>
                    <Th />
                  </tr>
                </Thead>
                <Tbody>
                  {cat.subcategories.length === 0 && (
                    <tr><Td colSpan={7} className="text-center py-4" style={{ color: "var(--color-text-muted)" }}>Nenhuma subcategoria</Td></tr>
                  )}
                  {cat.subcategories.map((sub) => {
                    const diff = sub.budget - sub.actual;
                    return (
                      <tr key={sub.id}>
                        <Td>{sub.name}</Td>
                        <Td>
                          {sub.kind === "ESSENTIAL" && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "var(--color-primary)" }}>Essencial</span>}
                          {sub.kind === "FREE" && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "var(--color-success)" }}>Livre</span>}
                          {sub.kind === "INVESTMENT" && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>Investimento</span>}
                          {!sub.kind && <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>—</span>}
                        </Td>
                        <Td className="text-right">{formatCurrency(sub.budget)}</Td>
                        <Td className="text-right">{formatCurrency(sub.actual)}</Td>
                        <Td className="text-right">{formatCurrency(sub.paid)}</Td>
                        <Td className="text-right" style={{ color: diff < 0 ? "var(--color-danger)" : diff > 0 ? "var(--color-success)" : undefined }}>
                          {formatCurrency(diff)}
                        </Td>
                        <Td style={{ paddingLeft: 0, paddingRight: 4 }}>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditSub(sub)} className="p-1 rounded hover:opacity-70" style={{ color: "var(--color-text-muted)" }}><Pencil size={16} /></button>
                            <button onClick={() => deleteSub(cat.id, sub.id)} className="p-1 rounded hover:opacity-70" style={{ color: "var(--color-danger)" }}><Trash2 size={16} /></button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </Tbody>
                {cat.subcategories.length > 0 && (
                  <tfoot>
                    <TotalRow>
                      <Td className="font-semibold">Subtotal</Td>
                      <Td />
                      <Td className="text-right font-semibold">{formatCurrency(catBudget)}</Td>
                      <Td className="text-right font-semibold">{formatCurrency(catActual)}</Td>
                      <Td className="text-right font-semibold">{formatCurrency(catPaid)}</Td>
                      <Td className="text-right font-semibold" style={{ color: catBudget - catActual < 0 ? "var(--color-danger)" : "var(--color-success)" }}>
                        {formatCurrency(catBudget - catActual)}
                      </Td>
                      <Td />
                    </TotalRow>
                  </tfoot>
                )}
              </Table>
            )}
          </Card>
        );
      })}

      {categories.length > 0 && (
        <Card>
          <Table>
            <colgroup>
              <col />
              <col style={{ width: 100 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 64 }} />
            </colgroup>
            <tfoot>
              <TotalRow>
                <Td className="font-bold text-base">Total Geral</Td>
                <Td />
                <Td className="text-right font-bold">{formatCurrency(grandTotal.budget)}</Td>
                <Td className="text-right font-bold">{formatCurrency(grandTotal.actual)}</Td>
                <Td className="text-right font-bold">{formatCurrency(grandTotal.paid)}</Td>
                <Td className="text-right font-bold" style={{ color: grandTotal.diff < 0 ? "var(--color-danger)" : "var(--color-success)" }}>
                  {formatCurrency(grandTotal.diff)}
                </Td>
                <Td />
              </TotalRow>
            </tfoot>
          </Table>
        </Card>
      )}

      {/* Modal: Nova Categoria */}
      <Modal open={modal === "cat"} onClose={() => setModal(null)} title="Nova Categoria" width="520px">
        <div className="flex flex-col gap-4">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="ex: Moradia, Lazer..." /></div>
          <div>
            <Label>Cor</Label>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {PALETTE.map(({ hex, label }) => (
                <button
                  key={hex}
                  title={label}
                  onClick={() => setForm((p) => ({ ...p, color: hex }))}
                  className="transition-transform hover:scale-110"
                  style={{
                    width: 28, height: 28, borderRadius: "50%", backgroundColor: hex, flexShrink: 0,
                    outline: form.color === hex ? `3px solid ${hex}` : "3px solid transparent",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Ícone</Label>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, backgroundColor: `${form.color || "#6366f1"}22` }}>
                <CategoryIcon name={form.icon || "Tag"} size={18} color={form.color || "#6366f1"} />
              </div>
              <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>{form.icon || "Tag"}</span>
            </div>
            <IconPicker value={form.icon || "Tag"} onChange={(icon) => setForm((p) => ({ ...p, icon }))} />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={saveCat} disabled={loading || !form.name}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar Categoria */}
      <Modal open={modal === "editCat"} onClose={() => { setModal(null); setEditingCat(null); }} title={`Editar — ${editingCat?.name}`} width="520px">
        <div className="flex flex-col gap-4">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div>
            <Label>Cor</Label>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {PALETTE.map(({ hex, label }) => (
                <button key={hex} title={label} onClick={() => setForm((p) => ({ ...p, color: hex }))} className="transition-transform hover:scale-110"
                  style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: hex, flexShrink: 0, outline: form.color === hex ? `3px solid ${hex}` : "3px solid transparent", outlineOffset: 2 }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Ícone</Label>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, backgroundColor: `${form.color || "#6366f1"}22` }}>
                <CategoryIcon name={form.icon || "Tag"} size={18} color={form.color || "#6366f1"} />
              </div>
              <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>{form.icon || "Tag"}</span>
            </div>
            <IconPicker value={form.icon || "Tag"} onChange={(icon) => setForm((p) => ({ ...p, icon }))} />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => { setModal(null); setEditingCat(null); }}>Cancelar</Button>
            <Button variant="primary" onClick={saveEditCat} disabled={loading || !form.name}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Nova Subcategoria */}
      <Modal open={modal === "sub"} onClose={() => setModal(null)} title="Nova Subcategoria">
        <div className="flex flex-col gap-4">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div>
            <Label>Tipo de Gasto</Label>
            <SelectWithNew
              value={form.kind}
              onChange={(v) => setForm((p) => ({ ...p, kind: v }))}
              options={[{ value: "ESSENTIAL", label: "Essencial" }, { value: "FREE", label: "Livre" }, { value: "INVESTMENT", label: "Investimento" }]}
            />
          </div>
          <div>
            <Label>Teto do Orçamento</Label>
            <Input type="number" step="0.01" min="0" value={form.budgetAmount} onChange={(e) => setForm((p) => ({ ...p, budgetAmount: e.target.value }))} placeholder="ex: 500,00" />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={saveSub} disabled={loading || !form.name}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar Subcategoria */}
      <Modal open={modal === "editSub"} onClose={() => { setModal(null); setEditingSub(null); }} title={`Editar — ${editingSub?.name}`}>
        <div className="flex flex-col gap-4">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div>
            <Label>Tipo de Gasto</Label>
            <SelectWithNew
              value={form.kind}
              onChange={(v) => setForm((p) => ({ ...p, kind: v }))}
              options={[{ value: "ESSENTIAL", label: "Essencial" }, { value: "FREE", label: "Livre" }, { value: "INVESTMENT", label: "Investimento" }]}
            />
          </div>
          <div>
            <Label>Teto do Orçamento (R$)</Label>
            <Input type="number" step="0.01" min="0" value={form.budgetAmount} onChange={(e) => setForm((p) => ({ ...p, budgetAmount: e.target.value }))} placeholder="0,00" />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => { setModal(null); setEditingSub(null); }}>Cancelar</Button>
            <Button variant="primary" onClick={saveEditSub} disabled={loading || !form.name}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirmação de Exclusão */}
      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} title="Confirmar exclusão">
        <div className="flex flex-col gap-5">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{confirmModal?.message}</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setConfirmModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleConfirm}>Excluir</Button>
          </div>
        </div>
      </Modal>

    </>
  );
}
