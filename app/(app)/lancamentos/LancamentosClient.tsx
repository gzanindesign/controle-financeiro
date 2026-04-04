"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { SelectWithNew } from "@/components/ui/SelectWithNew";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Trash2, CreditCard, Pencil } from "lucide-react";
import { IconPicker, CategoryIcon } from "@/components/ui/IconPicker";
import { Tabs } from "@/components/ui/Tabs";
import { ImportacaoClient } from "./ImportacaoClient";

interface CardItem { id: string; name: string; colorHex: string }
interface SubcategoryItem { id: string; name: string }
interface CategoryItem { id: string; name: string; icon?: string | null; color: string; subcategories: SubcategoryItem[] }
interface Transaction {
  id: string; date: string; description: string; amount: number;
  type: string; installmentCurrent: number | null; installmentTotal: number | null;
  groupId: string | null;
  isPaid: boolean;
  card: CardItem | null;
  subcategory: { id: string; name: string; category: { name: string } } | null;
}

interface ConfirmModal {
  title: string;
  message: string;
  onConfirm: () => void;
  extraAction?: { label: string; onClick: () => void };
}

interface MerchantMapping {
  id: string;
  merchantCode: string;
  friendlyName: string | null;
  subcategoryId: string | null;
  subcategory: { id: string; name: string; category: { name: string } } | null;
}

interface Props {
  transactions: Transaction[];
  cards: CardItem[];
  categories: CategoryItem[];
  month: number;
  year: number;
  merchantMappings: MerchantMapping[];
}

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

export function LancamentosClient({ transactions: initial, cards, categories: initialCategories, month, year, merchantMappings }: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"manual" | "import">("manual");
  const [txs, setTxs] = useState(initial);
  const [categories, setCategories] = useState(initialCategories);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    setTxs(initial);
    setActiveTab("all");
    setModal(null);
  }, [month, year]);

  async function refreshTxs() {
    const res = await fetch(`/api/transactions?mes=${month}&ano=${year}`);
    if (!res.ok) return;
    const data = await res.json();
    setTxs(data.map((t: {
      id: string; date: string; description: string; amount: number; type: string;
      installmentCurrent: number | null; installmentTotal: number | null;
      groupId: string | null; isCounted: boolean; isPaid: boolean;
      card: { id: string; name: string; colorHex: string } | null;
      subcategory: { id: string; name: string; category: { name: string } } | null;
    }) => ({
      ...t,
      date: typeof t.date === "string" ? t.date : new Date(t.date).toISOString(),
    })));
  }
  const [modal, setModal] = useState<"new" | "edit" | "newCat" | "newSub" | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);

  function makeEmptyForm(tab: string) {
    return {
      date: `${year}-${String(month).padStart(2, "0")}-01`,
      description: "", amount: "", type: "ONE_TIME",
      installmentTotal: "", cardId: tab === "all" || tab === "debit" ? "" : tab,
      categoryId: "", subcategoryId: "",
    };
  }
  const [form, setForm] = useState(() => makeEmptyForm(activeTab));

  // Form para nova categoria inline
  const [catForm, setCatForm] = useState({ name: "", icon: "Tag", color: "#6366f1" });
  // Form para nova subcategoria inline
  const [subForm, setSubForm] = useState({ name: "", categoryId: "", kind: "ESSENTIAL", paymentMethod: "CREDIT", cardId: "", dueDay: "", budgetAmount: "" });

  function openNew() { setForm(makeEmptyForm(activeTab)); setModal("new"); }

  function openEdit(t: Transaction) {
    setEditingTx(t);
    const catId = categories.find((c) => c.subcategories.some((s) => s.id === t.subcategory?.id))?.id ?? "";
    setForm({
      date: t.date.slice(0, 10),
      description: t.description,
      amount: String(t.amount),
      type: t.type,
      installmentTotal: t.installmentTotal ? String(t.installmentTotal) : "",
      cardId: t.card?.id ?? "",
      categoryId: catId,
      subcategoryId: t.subcategory?.id ?? "",
    });
    setModal("edit");
  }

  const filtered =
    activeTab === "all" ? txs :
    activeTab === "debit" ? txs.filter((t) => !t.card) :
    txs.filter((t) => t.card?.id === activeTab);

  const cardTotals: Record<string, { total: number; paid: boolean }> = {};
  txs.forEach((t) => {
    if (t.card) {
      if (!cardTotals[t.card.id]) {
        cardTotals[t.card.id] = { total: 0, paid: txs.filter((x) => x.card?.id === t.card!.id).every((x) => x.isPaid) };
      }
      cardTotals[t.card.id].total += t.amount;
    }
  });

  // Subcategorias filtradas pela categoria selecionada
  const filteredSubs = form.categoryId
    ? (categories.find((c) => c.id === form.categoryId)?.subcategories ?? [])
    : categories.flatMap((c) => c.subcategories);

  async function remove(t: Transaction) {
    if (t.type === "FIXED" && t.groupId) {
      setConfirmModal({
        title: "Excluir lançamento fixo",
        message: `"${t.description}" é um lançamento fixo. Deseja excluir apenas este mês ou este mês e todos os seguintes?`,
        onConfirm: async () => {
          await fetch(`/api/transactions/${t.id}?scope=single`, { method: "DELETE" });
          setTxs((p) => p.filter((x) => x.id !== t.id));
          router.refresh();
        },
        extraAction: {
          label: "Este e os seguintes",
          onClick: async () => {
            await fetch(`/api/transactions/${t.id}?scope=future`, { method: "DELETE" });
            setTxs((p) => p.filter((x) => x.id !== t.id));
            router.refresh();
            setConfirmModal(null);
          },
        },
      });
    } else {
      setConfirmModal({
        title: "Confirmar exclusão",
        message: "Tem certeza que deseja remover este lançamento?",
        onConfirm: async () => {
          await fetch(`/api/transactions/${t.id}`, { method: "DELETE" });
          setTxs((p) => p.filter((x) => x.id !== t.id));
          router.refresh();
        },
      });
    }
  }

  async function payCard(cardId: string, paid: boolean) {
    await fetch("/api/transactions/pay-card", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, month, year, paid }),
    });
    setTxs((p) => p.map((t) => t.card?.id === cardId ? { ...t, isPaid: paid } : t));
    router.refresh();
  }

  async function save() {
    setLoading(true);
    const payload = {
      date: form.date, description: form.description,
      amount: parseFloat(form.amount) || 0, type: form.type,
      installmentTotal: form.type === "INSTALLMENT" ? parseInt(form.installmentTotal) || null : null,
      cardId: form.cardId || null, subcategoryId: form.subcategoryId || null,
      month, year,
    };

    const res = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    const newTx = Array.isArray(data) ? data[0] : data;
    const card = cards.find((c) => c.id === newTx.cardId) ?? null;
    const cat = categories.find((c) => c.id === form.categoryId);
    const sub = cat?.subcategories.find((s) => s.id === newTx.subcategoryId) ?? null;
    setTxs((p) => [...p, { ...newTx, card, subcategory: sub && cat ? { id: sub.id, name: sub.name, category: { name: cat.name } } : null }]);
    setLoading(false); setModal(null);
    router.refresh();
  }

  async function doSaveEdit(scope: "single" | "future") {
    if (!editingTx) return;
    setLoading(true);
    const cardId = form.cardId || null;
    const payload = {
      description: form.description,
      amount: parseFloat(form.amount) || 0,
      cardId,
      subcategoryId: form.subcategoryId || null,
      isPaid: !cardId,
      scope,
    };

    await fetch(`/api/transactions/${editingTx.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

    const card = cards.find((c) => c.id === cardId) ?? null;
    const cat = categories.find((c) => c.id === form.categoryId);
    const sub = cat?.subcategories.find((s) => s.id === form.subcategoryId) ?? null;

    if (scope === "future" && editingTx.groupId) {
      setTxs((p) => p.map((t) => t.groupId === editingTx.groupId ? {
        ...t, description: form.description, amount: parseFloat(form.amount) || 0,
        card, subcategory: sub && cat ? { id: sub.id, name: sub.name, category: { name: cat.name } } : null, isPaid: !cardId,
      } : t));
    } else {
      setTxs((p) => p.map((t) => t.id === editingTx.id ? {
        ...t, date: form.date, description: form.description, amount: parseFloat(form.amount) || 0,
        card, subcategory: sub && cat ? { id: sub.id, name: sub.name, category: { name: cat.name } } : null, isPaid: !cardId,
      } : t));
    }
    setLoading(false); setModal(null); setEditingTx(null);
    router.refresh();
  }

  async function saveEdit() {
    if (!editingTx) return;
    if (editingTx.type === "FIXED" && editingTx.groupId) {
      setModal(null);
      setConfirmModal({
        title: "Editar lançamento fixo",
        message: `Deseja atualizar apenas este mês ou este mês e todos os seguintes?`,
        onConfirm: () => doSaveEdit("single"),
        extraAction: {
          label: "Este e os seguintes",
          onClick: () => { doSaveEdit("future"); setConfirmModal(null); },
        },
      });
    } else {
      await doSaveEdit("single");
    }
  }

  // Criar categoria inline
  async function saveNewCat() {
    setLoading(true);
    const res = await fetch("/api/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catForm.name, icon: catForm.icon, color: catForm.color }),
    });
    const cat = await res.json();
    const newCat: CategoryItem = { id: cat.id, name: cat.name, icon: cat.icon, color: cat.color ?? "#6366f1", subcategories: [] };
    setCategories((p) => [...p, newCat].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((p) => ({ ...p, categoryId: cat.id, subcategoryId: "" }));
    setCatForm({ name: "", icon: "Tag", color: "#6366f1" });
    setLoading(false); setModal("new");
  }

  // Criar subcategoria inline
  async function saveNewSub() {
    setLoading(true);
    const catId = subForm.categoryId || form.categoryId;
    const res = await fetch("/api/subcategories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: catId, name: subForm.name,
        dueDay: subForm.dueDay ? Number(subForm.dueDay) : null,
        paymentMethod: subForm.paymentMethod, cardId: subForm.cardId || null,
        kind: subForm.kind,
      }),
    });
    const sub = await res.json();
    setCategories((p) => p.map((c) => c.id === catId
      ? { ...c, subcategories: [...c.subcategories, { id: sub.id, name: sub.name }].sort((a, b) => a.name.localeCompare(b.name)) }
      : c
    ));
    setForm((p) => ({ ...p, categoryId: catId, subcategoryId: sub.id }));
    setSubForm({ name: "", categoryId: "", kind: "ESSENTIAL", paymentMethod: "CREDIT", cardId: "", dueDay: "", budgetAmount: "" });
    setLoading(false); setModal("new");
  }

  const transactionFormFields = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} /></div>
        <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0,00" /></div>
      </div>
      <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="ex: Netflix, Supermercado..." /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tipo</Label>
          <SelectWithNew
            value={form.type}
            onChange={(v) => setForm((p) => ({ ...p, type: v }))}
            options={[{ value: "ONE_TIME", label: "Único" }, { value: "FIXED", label: "Fixo" }, { value: "INSTALLMENT", label: "Parcelado" }]}
          />
        </div>
        {form.type === "INSTALLMENT" && (
          <div><Label>Nº de Parcelas</Label><Input type="number" min="2" value={form.installmentTotal} onChange={(e) => setForm((p) => ({ ...p, installmentTotal: e.target.value }))} /></div>
        )}
        {form.type === "FIXED" && (
          <div className="flex items-end">
            <p className="text-xs pb-1" style={{ color: "var(--color-text-muted)" }}>Criado para os próximos 24 meses automaticamente.</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Cartão <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(vazio = débito)</span></Label>
          <SelectWithNew
            value={form.cardId}
            onChange={(v) => setForm((p) => ({ ...p, cardId: v }))}
            options={[{ value: "", label: "— Débito / Dinheiro —" }, ...cards.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </div>
        {/* Categoria */}
        <div>
          <Label>Categoria</Label>
          <SelectWithNew
            value={form.categoryId}
            onChange={(v) => setForm((p) => ({ ...p, categoryId: v, subcategoryId: "" }))}
            options={categories.map((c) => ({ value: c.id, label: c.name, icon: c.icon ?? undefined, color: c.color }))}
            onNew={() => { setCatForm({ name: "", icon: "Tag", color: "#6366f1" }); setModal("newCat"); }}
            newLabel="+ Nova Categoria"
          />
        </div>
      </div>
      {/* Subcategoria */}
      <div>
        <Label>Subcategoria</Label>
        <SelectWithNew
          value={form.subcategoryId}
          onChange={(v) => setForm((p) => ({ ...p, subcategoryId: v }))}
          options={filteredSubs.map((s) => ({ value: s.id, label: s.name }))}
          onNew={() => { setSubForm({ name: "", categoryId: form.categoryId, kind: "ESSENTIAL", paymentMethod: "CREDIT", cardId: "", dueDay: "", budgetAmount: "" }); setModal("newSub"); }}
          newLabel="+ Nova Subcategoria"
        />
      </div>
      {!form.cardId && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Lançamentos sem cartão são marcados como pagos automaticamente.
        </p>
      )}
    </>
  );

  return (
    <>
      {/* View toggle */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ backgroundColor: "var(--bg-elevated)" }}>
        <button
          onClick={() => { setViewMode("manual"); if (viewMode === "import") refreshTxs(); }}
          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={viewMode === "manual"
            ? { backgroundColor: "var(--bg-surface)", color: "var(--color-text)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
            : { color: "var(--color-text-muted)", backgroundColor: "transparent" }}
        >
          Lançamentos
        </button>
        <button
          onClick={() => setViewMode("import")}
          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={viewMode === "import"
            ? { backgroundColor: "var(--bg-surface)", color: "var(--color-text)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
            : { color: "var(--color-text-muted)", backgroundColor: "transparent" }}
        >
          Importar Fatura
        </button>
      </div>

      {viewMode === "import" && (
        <ImportacaoClient
          categories={categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color, subcategories: c.subcategories }))}
          cards={cards}
          merchantMappings={merchantMappings}
          month={month}
          year={year}
          existingTransactions={txs.map((t) => ({
            date: t.date.slice(0, 10),
            description: t.description,
            amount: t.amount,
          }))}
        />
      )}

      {viewMode === "manual" && <>
      {/* Faturas por cartão */}
      {cards.filter((c) => cardTotals[c.id]).length > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          {cards.filter((c) => cardTotals[c.id]).map((c) => {
            const { total, paid } = cardTotals[c.id];
            return (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: c.colorHex }}>
                <CreditCard size={14} />
                <span>{c.name}: {formatCurrency(total)}</span>
                <button
                  onClick={() => payCard(c.id, !paid)}
                  className="text-xs px-2 py-0.5 rounded-full transition-colors"
                  style={{ backgroundColor: paid ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.2)" }}
                >
                  {paid ? "Fatura Paga" : "Pagar Fatura"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <div className="mb-4" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", rowGap: "10px" }}>
          {/* Chips de filtro — podem quebrar linha */}
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <Tabs
              value={activeTab}
              onChange={(id) => { setActiveTab(id); }}
              items={[
                { id: "all", label: "Todos" },
                { id: "debit", label: "Débito" },
                ...cards.map((c) => ({ id: c.id, label: c.name, color: c.colorHex })),
              ]}
            />
          </div>
          {/* Botões — sempre na mesma linha, nunca quebram */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, whiteSpace: "nowrap" }}>
            {txs.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setConfirmModal({
                title: "Excluir todos os lançamentos",
                message: `Tem certeza que deseja excluir todos os ${txs.length} lançamentos deste mês? Esta ação não pode ser desfeita.`,
                onConfirm: async () => {
                  await fetch("/api/transactions/delete-all", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ month, year }),
                  });
                  setTxs([]);
                  router.refresh();
                },
              })} style={{ color: "var(--color-danger)" }}>
                <Trash2 size={14} className="inline mr-1" />Excluir todos
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={openNew}><Plus size={14} className="inline mr-1" />Adicionar</Button>
          </div>
        </div>

        <Table>
          <Thead>
            <tr>
              <Th>Data</Th>
              <Th>Descrição</Th>
              <Th>Cartão</Th>
              <Th>Categoria</Th>
              <Th>Tipo</Th>
              <Th className="text-right">Valor</Th>
              <Th className="text-center">Pago</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {filtered.length === 0 && (
              <tr><Td colSpan={8} className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>Nenhum lançamento</Td></tr>
            )}
            {filtered.map((t) => (
              <tr key={t.id}>
                <Td className="text-sm">{formatDate(t.date)}</Td>
                <Td>
                  <span>{t.description}</span>
                  {t.type === "INSTALLMENT" && t.installmentCurrent && t.installmentTotal && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--color-text-muted)" }}>
                      {t.installmentCurrent}/{t.installmentTotal}
                    </span>
                  )}
                  {t.type === "FIXED" && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--color-text-muted)" }}>
                      fixo
                    </span>
                  )}
                </Td>
                <Td>
                  {t.card ? (
                    <span className="px-2 py-0.5 rounded text-xs text-white" style={{ backgroundColor: t.card.colorHex }}>{t.card.name}</span>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Débito</span>
                  )}
                </Td>
                <Td className="text-sm">{t.subcategory ? `${t.subcategory.category.name} › ${t.subcategory.name}` : "—"}</Td>
                <Td className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {t.type === "FIXED" ? "Fixo" : t.type === "ONE_TIME" ? "Único" : "Parcelado"}
                </Td>
                <Td className="text-right font-medium">{formatCurrency(t.amount)}</Td>
                <Td className="text-center">
                  {t.isPaid ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "var(--color-success)" }}>
                      Pago
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(148,163,184,0.15)", color: "var(--color-text-muted)" }}>
                      Pendente
                    </span>
                  )}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(t)} className="p-1 rounded hover:opacity-70" style={{ color: "var(--color-text-muted)" }}><Pencil size={16} /></button>
                    <button onClick={() => remove(t)} className="p-1 rounded hover:opacity-70" style={{ color: "var(--color-danger)" }}><Trash2 size={16} /></button>
                  </div>
                </Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      </Card>

      {/* Modal: Novo Lançamento */}
      <Modal open={modal === "new"} onClose={() => setModal(null)} title="Novo Lançamento" width="560px">
        <div className="flex flex-col gap-4">
          {transactionFormFields}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={save} disabled={loading || !form.description || !form.amount}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar Lançamento */}
      <Modal open={modal === "edit"} onClose={() => { setModal(null); setEditingTx(null); }} title="Editar Lançamento" width="560px">
        <div className="flex flex-col gap-4">
          {transactionFormFields}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => { setModal(null); setEditingTx(null); }}>Cancelar</Button>
            <Button variant="primary" onClick={saveEdit} disabled={loading || !form.description || !form.amount}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Nova Categoria inline */}
      <Modal open={modal === "newCat"} onClose={() => setModal("new")} title="Nova Categoria" width="480px">
        <div className="flex flex-col gap-4">
          <div><Label>Nome</Label><Input value={catForm.name} onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))} placeholder="ex: Moradia, Lazer..." /></div>
          <div>
            <Label>Cor</Label>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {PALETTE.map(({ hex, label }) => (
                <button key={hex} title={label} type="button" onClick={() => setCatForm((p) => ({ ...p, color: hex }))}
                  className="transition-transform hover:scale-110"
                  style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: hex, flexShrink: 0, outline: catForm.color === hex ? `3px solid ${hex}` : "3px solid transparent", outlineOffset: 2 }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Ícone</Label>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, backgroundColor: `${catForm.color}22` }}>
                <CategoryIcon name={catForm.icon || "Tag"} size={18} color={catForm.color} />
              </div>
              <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>{catForm.icon || "Tag"}</span>
            </div>
            <IconPicker value={catForm.icon || "Tag"} onChange={(icon) => setCatForm((p) => ({ ...p, icon }))} />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setModal("new")}>Cancelar</Button>
            <Button variant="primary" onClick={saveNewCat} disabled={loading || !catForm.name}>Salvar e voltar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Nova Subcategoria inline */}
      <Modal open={modal === "newSub"} onClose={() => setModal("new")} title="Nova Subcategoria" width="480px">
        <div className="flex flex-col gap-4">
          <div>
            <Label>Categoria</Label>
            <SelectWithNew
              value={subForm.categoryId || form.categoryId}
              onChange={(v) => setSubForm((p) => ({ ...p, categoryId: v }))}
              options={categories.map((c) => ({ value: c.id, label: c.name, icon: c.icon ?? undefined, color: c.color }))}
            />
          </div>
          <div><Label>Nome</Label><Input value={subForm.name} onChange={(e) => setSubForm((p) => ({ ...p, name: e.target.value }))} placeholder="ex: Aluguel, Netflix..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Meio de Pagamento</Label>
              <SelectWithNew
                value={subForm.paymentMethod}
                onChange={(v) => setSubForm((p) => ({ ...p, paymentMethod: v }))}
                options={[{ value: "CREDIT", label: "Cartão de Crédito" }, { value: "DEBIT", label: "Débito / Conta" }]}
              />
            </div>
            <div>
              <Label>Tipo de Gasto</Label>
              <SelectWithNew
                value={subForm.kind}
                onChange={(v) => setSubForm((p) => ({ ...p, kind: v }))}
                options={[{ value: "ESSENTIAL", label: "Essencial" }, { value: "FREE", label: "Livre" }, { value: "INVESTMENT", label: "Investimento" }]}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setModal("new")}>Cancelar</Button>
            <Button variant="primary" onClick={saveNewSub} disabled={loading || !subForm.name || !(subForm.categoryId || form.categoryId)}>Salvar e voltar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirmação */}
      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} title={confirmModal?.title ?? "Confirmar"}>
        <div className="flex flex-col gap-5">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{confirmModal?.message}</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setConfirmModal(null)}>Cancelar</Button>
            {confirmModal?.extraAction && (
              <Button variant="danger" onClick={confirmModal.extraAction.onClick}>
                {confirmModal.extraAction.label}
              </Button>
            )}
            <Button variant="danger" onClick={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}>
              {confirmModal?.extraAction ? "Só este mês" : "Excluir"}
            </Button>
          </div>
        </div>
      </Modal>
      </>}
    </>
  );
}
